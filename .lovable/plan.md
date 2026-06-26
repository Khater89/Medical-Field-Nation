## نظرة عامة

تنفيذ دورة حياة كاملة للصيدليات (ولاحقاً باقي البائعين) من التسجيل → موافقة الأدمن → التفعيل التلقائي → لوحة تحكم البائع → ظهور للعميل → دردشة وشراء. سيتم البناء على البنية الحالية (`marketplace_vendors`, `marketplace_products`, `marketplace_orders`, role `vendor`) وإضافة ما ينقص فقط دون كسر الموجود.

---

## المرحلة 1 — قاعدة البيانات (Migration واحدة)

### 1.1 تفعيل الحساب التلقائي عند الموافقة
- Trigger على `marketplace_vendors` عند تحويل `status` من `pending` → `approved`:
  - إضافة الدور `vendor` تلقائياً لـ `owner_user_id` في `user_roles` (إن لم يكن موجوداً).
  - تعيين `vendor_number` (موجود مسبقاً).
  - إرسال إشعار للبائع عبر `staff_notifications` (target_role='vendor').
- عند الرفض/التعليق: إزالة دور `vendor` فقط إذا لم يكن لديه بائع آخر معتمد.

### 1.2 حقول إضافية لـ `marketplace_vendors`
- `logo_url text`, `cover_url text`, `description text`, `working_hours jsonb`, `is_open boolean default true`, `area_text text` (إن لم تكن موجودة سيُتحقق ويُضاف).

### 1.3 حقول إضافية لـ `marketplace_products`
- `original_price numeric`, `has_discount boolean generated`, `requires_approval boolean default false`, `requires_prescription boolean default false`, `is_sensitive boolean default false`, `approval_status text check in ('approved','pending','rejected')` بقيمة افتراضية حسب نوع المنتج/البائع.
- Trigger: للصيدليات، إذا `is_sensitive=true` يُجبر `approval_status='pending'` حتى يوافق الأدمن.

### 1.4 جدول رسائل السوق `marketplace_chats` + `marketplace_messages`
```
marketplace_chats(id, vendor_id, customer_user_id, product_id null, last_message_at, unread_for_vendor, unread_for_customer)
marketplace_messages(id, chat_id, sender_id, sender_role text, body text, created_at)
```
- RLS: العميل يرى محادثاته فقط، صاحب البائع يرى محادثات بائعه فقط، الأدمن يرى الكل.
- GRANT + ENABLE RLS + POLICIES.
- Realtime publication.

### 1.5 RPCs
- `vendor_send_message`, `customer_send_marketplace_message`, `list_marketplace_chats`, `list_marketplace_messages`, `mark_marketplace_chat_seen`.
- `admin_approve_vendor(_id, _note)`, `admin_reject_vendor(_id, _reason)`, `admin_toggle_vendor_active(_id, _active)`.
- `admin_approve_product(_id)`, `admin_reject_product(_id, _reason)`.

### 1.6 RLS
- العميل (anon/authenticated) يرى `marketplace_vendors` حيث `status='approved'` و `is_active=true` فقط.
- العميل يرى `marketplace_products` حيث المنتج `is_active` و `approval_status='approved'` وصاحب البائع نشط.
- Realtime على `marketplace_orders` + `marketplace_messages`.

---

## المرحلة 2 — توجيه ما بعد تسجيل الدخول

تعديل `AuthCallback.tsx` و `AuthContext` بحيث:
- إذا للمستخدم دور `vendor` ولديه بائع `approved` → التوجيه إلى `/vendor`.
- وإلا الإبقاء على المنطق الحالي.

---

## المرحلة 3 — لوحة إدارة الصيدلية (تطوير `VendorDashboard`)

تبويبات:
1. **بيانات الصيدلية** (`VendorStoreInfo` موجود — توسيع: شعار، صور، ساعات عمل، حالة مفتوح/مغلق، وصف).
2. **المنتجات** (`VendorProductsManager` موجود — توسيع: خصم، سعر قبل/بعد، تفعيل/تعطيل، طلب مراجعة للحساس).
3. **العروض/البكجات** — صفحة بسيطة لتعليم منتج كـ "عرض" مع `original_price`.
4. **الطلبات** (`VendorOrdersList` موجود — توسيع حالات: NEW, REVIEW, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, COMPLETED, CANCELLED).
5. **الرسائل** — مكون جديد `VendorChatsTab` يعرض المحادثات والرد عليها (Realtime).
6. **الإشعارات** (جرس) — `VendorNotificationBell` يستخدم `staff_notifications` بنفس نمط `ProviderNotificationBell`.

---

## المرحلة 4 — واجهة العميل

### 4.1 صفحة قائمة الصيدليات `/marketplace/pharmacies`
- بطاقات صيدليات: شعار، اسم، منطقة، حالة مفتوح/مغلق، ساعات، تقييم، عدد منتجات، زر "عرض الصيدلية"، زر "تواصل".
- فلتر/بحث.

### 4.2 صفحة تفاصيل الصيدلية `/marketplace/vendor/:id`
- هيدر: شعار/كفر/اسم/منطقة/حالة/وصف.
- شبكة منتجات مع بحث وفلترة بالتصنيف.
- زر "تواصل مع الصيدلية" يفتح Dialog دردشة.
- على بطاقة المنتج: "أضف إلى السلة" + "اسأل عن المنتج".

### 4.3 صفحة تفاصيل المنتج (موجودة) — إضافة زر "اسأل عن المنتج" يفتح الدردشة بربط `product_id`.

### 4.4 مكون دردشة `MarketplaceChatDialog` + صفحة `/marketplace/messages` للعميل لعرض محادثاته.

### 4.5 السلة والشراء (موجودة) — التأكد أن `MarketplaceCartContext` يعمل لكل بائع منفصل، وأن `CheckoutPage` ينشئ طلب مرتبط بالبائع الصحيح.

---

## المرحلة 5 — لوحة الأدمن

تعديل `MarketplaceVendorsTab.tsx`:
- زر **موافقة/رفض** يستدعي `admin_approve_vendor` / `admin_reject_vendor`.
- زر **تفعيل/تعطيل**.
- عرض ترخيص الصيدلية ووثائقها.
- تبويب **منتجات بانتظار الموافقة** مع موافقة/رفض.
- تبويب **محادثات السوق** للمراقبة عند الحاجة.

---

## المرحلة 6 — التعميم على باقي الأقسام

نفس الـ schema يخدم كل أنواع البائعين (`vendor_type`): الأجهزة الطبية، الأطراف، التنفس، العيون، الأسنان، العلاج الطبيعي. الفروق المنطقية فقط:
- منطق المنتج الحساس/الوصفة يبقى للصيدليات.
- صفحات القوائم لكل قسم تستخدم نفس مكوّن `VendorsList` مع فلتر `vendor_type`.

---

## التفاصيل التقنية

- جميع الجداول الجديدة في `public` ستحصل على `GRANT` صريحة + `ENABLE RLS` + policies + triggers `updated_at`.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE …` للمحادثات والطلبات.
- استخدام Lovable Cloud فقط، لا أسرار خارجية.
- الحفاظ على كل المنطق الحالي (الحجوزات، المزودون، المالية) دون مساس.
- اختبار التدفق: تسجيل صيدلية → موافقة → تسجيل دخول → توجيه للوحة → إضافة منتج → ظهور للعميل → دردشة → شراء → ظهور في لوحة الصيدلية.

---

## الترتيب المقترح للتنفيذ

1. Migration واحدة شاملة (المرحلة 1).
2. توجيه ما بعد الدخول (المرحلة 2).
3. لوحة الصيدلية (المرحلة 3).
4. واجهات العميل (المرحلة 4).
5. لوحة الأدمن (المرحلة 5).
6. تكرار النمط لباقي الأقسام (المرحلة 6).

العمل ضخم. أقترح التنفيذ على دفعتين: **(أ) المراحل 1-3** ثم **(ب) المراحل 4-6** للحفاظ على الجودة والاختبار بين كل دفعة.
