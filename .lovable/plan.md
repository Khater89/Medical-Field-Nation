# خطة: فصل الرسائل عن عروض السعر + تثبيت السعر

## 1. تغييرات قاعدة البيانات (Migration واحد)

**`booking_messages`** — إضافة عمود:
- `message_type TEXT DEFAULT 'NORMAL'` مع CHECK لقيم: `NORMAL, REQUEST_BETTER_OFFER, REQUEST_PRICE_LOCK, REQUEST_OFFER, SYSTEM, OFFER_NOTICE`

> الجدول الحالي يستخدم `body` و`sender_role` و`target_provider_id` — سنبقي عليها كما هي. عروض السعر تبقى في `provider_quotes` الموجود.

**`bookings`** — إضافة أعمدة:
- `price_locked BOOLEAN DEFAULT false`
- `price_locked_at TIMESTAMPTZ`
- `price_locked_by UUID`
- `final_price NUMERIC`
- `final_offer_id UUID` (يشير إلى `provider_quotes.id`)

**RPC جديدة:**

`public.provider_lock_price(_booking_id uuid)` — security definer:
- يتحقق أن المستدعي هو المزود المعيّن أو محجوز أو لديه quote
- يجلب آخر quote للمزود لهذا الحجز
- يُحدّث `bookings`: `price_locked=true, price_locked_at=now(), price_locked_by=auth.uid(), final_price=<latest quote>, final_offer_id=<id>, agreed_price=<latest>`
- يُدرج رسالة SYSTEM: "✅ تم تثبيت السعر النهائي: X د.أ"
- يُدرج سجل في `booking_history`

**حماية backend (Trigger):**
- Trigger `BEFORE INSERT` على `provider_quotes` يرفض إذا `bookings.price_locked = true` مع `RAISE EXCEPTION 'price_locked'`.

## 2. تغييرات الواجهة الأمامية

### العميل — `CustomerOrderTracker.tsx` (والمكون المستخدم في BookingChat)
إضافة قسم "الإجراءات السريعة" مع 3 أزرار chips:
- "أرجو إرسال عرض الطلب" → `send_booking_message` مع `message_type='REQUEST_OFFER'` نص: "أرجو إرسال عرض الطلب."
- "هل يمكنك تقديم عرض أفضل؟" → `REQUEST_BETTER_OFFER` (معطل إذا `price_locked`)
- "ثبّت السعر" → `REQUEST_PRICE_LOCK`

إذا `price_locked`: badge "السعر مثبت" + "السعر النهائي: X د.أ" + تعطيل زر "عرض أفضل".

> سنحتاج تعديل RPC `send_booking_message` لقبول `_message_type`.

### المزود — `BookingChat.tsx` / تفاصيل الطلب
فصل بصري كامل لقسمين:

**قسم "الرسائل"**: textarea + زر "إرسال رسالة" → `send_booking_message` بدون سعر (`message_type='NORMAL'`).

**قسم "عرض السعر"**: input سعر + textarea ملاحظة + زر "إرسال عرض السعر" → insert في `provider_quotes` + رسالة SYSTEM "تم إرسال عرض سعر بقيمة X د.أ" (`message_type='OFFER_NOTICE'`).
- زر "تثبيت السعر" → modal تأكيد → `provider_lock_price` RPC.
- إذا `price_locked`: تعطيل input والأزرار + badge.

### المزود — عرض رسائل العميل
بناءً على `message_type` إظهار شارة ملوّنة:
- REQUEST_OFFER → "📩 طلب إرسال عرض"
- REQUEST_BETTER_OFFER → "💬 طلب تفاوض"
- REQUEST_PRICE_LOCK → "🔒 طلب تثبيت السعر"

### Admin
في `BookingDetailsDrawer` / `BookingMessagesDialog`: إظهار badge "السعر مثبت" + `final_price` + `price_locked_by` + `price_locked_at`.

## 3. Realtime
الاشتراك الحالي على `bookings` UPDATE يلتقط تغيير `price_locked` تلقائياً. سنضيف اشتراك على `booking_messages` و`provider_quotes` حيث يلزم.

## ملف تقني سريع

- Migration: `add_price_lock_and_message_types`
- تحديث RPCs: `send_booking_message` (+param), `provider_lock_price` (جديدة)
- ملفات أمامية:
  - `src/components/booking/CustomerOrderTracker.tsx` — أزرار سريعة + badge
  - `src/components/booking/BookingChat.tsx` — فصل قسمين + تثبيت
  - `src/components/admin/BookingDetailsDrawer.tsx` — عرض الحالة
  - `src/integrations/supabase/types.ts` — يُعاد توليده تلقائياً بعد الـ migration

## ملاحظات
- نستخدم `provider_quotes` الموجود بدلاً من إنشاء `booking_offers` جديد لتجنّب تكرار البيانات.
- الحقول `latest_offer_amount/id` ليست ضرورية — `final_price/final_offer_id` يكفيان مع آخر quote من `provider_quotes`.
- لن أغيّر منطق التسعير الحالي (`agreed_price`)؛ سأحدّثه بنفس قيمة `final_price` عند التثبيت للحفاظ على التوافق.
