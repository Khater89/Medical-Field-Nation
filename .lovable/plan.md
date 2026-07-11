
# خطة التنفيذ — إعادة هيكلة شاملة

## 1. الصفحة الرئيسية الجديدة (`/`)
- استبدال `LandingPage` بصفحة hub بسيطة تحتوي على بطاقتين كبيرتين:
  - **السوق الطبي** → `/marketplace`
  - **الخدمات الطبية** → `/services`
- تصميم نظيف بأيقونات Lucide فقط (بدون صور AI)، متجاوب، RTL.
- Header عام + تذييل بسيط + روابط تسجيل الدخول لكل قسم.

## 2. تبويب الخدمات `/services`
- إنشاء `ServicesHome` كصفحة هبوط لقسم الخدمات تحتوي:
  - حجز خدمة (يوجّه لـ `/booking`)
  - تتبع الطلب (يدمج `/track` كصفحة داخلية)
  - التعيين الذاتي (يعيش داخل قسم الخدمات)
  - عرض فئات الخدمات (أطباء، تمريض، علاج طبيعي…) من جدول `services`
- شاشة دخول خاصة `/services/login` (هاتف + Google + Apple)
- بعد الدخول: يبقى ضمن `/services/*`
- الصفحات الحالية `/booking` و `/track` تُبقى تعمل كما هي (روابط داخلية).

## 3. تبويب السوق الطبي `/marketplace`
- يبقى كما هو مع إضافة أقسام إضافية (أجهزة تنفس، أسنان، عيون…) عبر `marketplace_categories`.
- شاشة دخول `/marketplace/login` (موجودة `MarketplacePhoneAuth`) + إضافة أزرار Google/Apple.
- بعد الدخول للعميل: يبقى ضمن `/marketplace/*`.
- المتاجر لا ترى واجهة العميل (موجود بالفعل عبر `MarketplaceAuthGate`).

## 4. توحيد الحساب
- نفس مستخدم Supabase يعمل في التبويبين؛ لا حسابات مكررة.
- OAuth (Google/Apple) → عند الدخول لأول مرة نطلب رقم الهاتف والتحقق عبر OTP، ثم نحدّث `profiles.phone`.
- إضافة صفحة `/complete-profile` تُعرض تلقائيًا إذا كان `profiles.phone` فارغًا بعد OAuth.

## 5. تسجيل الدخول (لكل تبويب)
طرق الدخول الثلاث في كلا الشاشتين:
- **الهاتف + OTP** (موجود)
- **Google** (عبر `lovable.auth.signInWithOAuth("google")`)
- **Apple** (عبر `lovable.auth.signInWithOAuth("apple")`)
- بعد الدخول: توجيه ذكي حسب الدور (vendor → `/vendor`, provider → `/provider`, admin → `/admin`) وإلا حسب `redirect` param للتبويب الأصلي.

## 6. إصلاح الدردشة (السوق الطبي)

### تشخيص المشكلة الحالية
جدول `marketplace_chats` يستخدم غالبًا `session_id` للضيوف مما يمنع العميل من رؤية الردود بعد تسجيل الخروج والعودة.

### الإصلاحات في قاعدة البيانات
- التأكد من أن `marketplace_chats` يحتوي: `id`, `customer_id (uuid)`, `vendor_id`, `product_id (nullable)`, `customer_phone`, `last_message_at`, `unread_customer`, `unread_vendor`.
- Unique constraint: `(customer_id, vendor_id, product_id)` — محادثة واحدة لكل زوج/منتج.
- `marketplace_messages`: `chat_id`, `sender_type` ('customer'|'vendor'), `sender_id`, `content`, `attachment_url`, `read_at`, `created_at`.
- RLS: العميل يرى محادثاته حيث `customer_id = auth.uid()`; المتجر يرى حيث `vendor_id IN (…owned by auth.uid())`.
- Realtime على الجدولين.

### الإصلاحات في الكود
- عند إرسال رسالة من العميل: البحث/الإنشاء بـ `(customer_id=auth.uid, vendor_id, product_id)` بدل session.
- عند فتح إشعار: التوجيه `/marketplace/messages?chat=<id>` وفتح المحادثة الصحيحة وتعليم كمقروءة.
- فصل تام عن دردشة الحجوزات (`booking_messages`) — لا تغيير هناك.

## 7. إشعارات الدردشة
- Bell في هيدر السوق الطبي يعرض `unread_customer` من `marketplace_chats`.
- Bell في لوحة المتجر يعرض `unread_vendor`.
- الضغط على إشعار → فتح المحادثة الصحيحة وتصفير العداد.

## 8. Routing النهائي
```text
/                        → HomeHub (تبويبان)
/services                → ServicesHome
/services/login          → ServicesAuth (phone+google+apple)
/services/track          → TrackOrderPage
/services/booking        → BookingPage (redirect من /booking)
/marketplace             → MarketplaceHome (كما هو)
/marketplace/login       → MarketplacePhoneAuth (+google+apple)
/marketplace/messages    → MarketplaceMessagesPage (مُصلَحة)
/vendor, /provider, /admin, /cs   → بدون تغيير
```
الروابط القديمة `/booking`, `/track` تبقى تعمل (redirect للمسارات الجديدة).

## 9. اختبارات يدوية بعد التنفيذ
عبر Playwright في السّاند‑بوكس:
1. فتح `/` → رؤية التبويبين.
2. دخول عميل بالهاتف من `/marketplace/login` → إرسال رسالة لصيدلية.
3. دخول متجر → رؤية الرسالة والرد.
4. خروج العميل ثم دخوله مجددًا → التأكد من رؤية الرد.
5. اختبار أن المتجر لا يستطيع الوصول لـ `/marketplace/*`.
6. اختبار Google/Apple OAuth (mock إن تعذّر).

## ملاحظات تقنية للمستخدم
- سيتم الحفاظ على **جميع** الميزات الحالية؛ لا حذف لأي جدول أو صفحة.
- التوجيه القديم (`/booking`, `/track`) يبقى يعمل عبر redirects.
- Google/Apple تحتاج تفعيل موفّري OAuth من إعدادات Cloud (Google مفعّل افتراضيًا؛ Apple يحتاج تأكيد).
- سيتم إنشاء migration واحدة لإصلاح schema/RLS الخاص بالدردشة قبل أي تعديل كود.

## نطاق العمل التقريبي
- ملفات جديدة: `HomeHub.tsx`, `ServicesHome.tsx`, `ServicesAuth.tsx`, `CompleteProfilePage.tsx`, hook للدردشة.
- تعديل: `App.tsx` (routing), `MarketplacePhoneAuth.tsx` (+OAuth), `MarketplaceMessagesPage`, `MarketplaceChatDialog`, `VendorChatsTab`, `LandingPage` (يصبح `/landing-old` أو يُستبدل).
- Migration: schema+RLS للدردشة، function للحصول/إنشاء chat.

هل أبدأ التنفيذ بهذا الترتيب؟ أم تريد تعديل شيء في الخطة (مثلاً تأجيل Apple OAuth، أو الإبقاء على `LandingPage` الحالية كصفحة تسويقية منفصلة)؟
