# خطة التنفيذ — فلترة الجنس + دردشة محدودة بالسعر

## 1) قاعدة البيانات (Migration واحد)

### إضافة أعمدة
- `profiles.gender` TEXT (`male` | `female`) — للمزودين
- `bookings.gender_released` BOOLEAN DEFAULT false — لتعطيل فلترة الجنس
- `bookings.gender_released_at` TIMESTAMPTZ
- `bookings.gender_released_by` UUID
- `booking_messages.quoted_price` موجود مسبقاً ✓

### تحديث Functions (لإضافة فلترة الجنس)
- `available_bookings_for_providers()` — فلترة بـ `provider_gender` من `bookings.notes/internal` → نخزّن `bookings.required_gender` كعمود جديد
- `bookings.required_gender` TEXT جديد، يُملأ من `provider_gender` في PatientForm
- `list_booking_messages()` — لا تغيير في المنطق الأساسي
- `provider_messages_inbox()` — إضافة فلتر الجنس
- `find_nearest_providers()` — إضافة بارامتر `_required_gender`

### RPC جديد
- `admin_release_gender(_booking_id)` — فقط admin/cs، يضع `gender_released=true` ويسجل في `booking_history`

### قاعدة فلترة الجنس
في كل الاستعلامات: 
```
(b.gender_released = true OR b.required_gender IS NULL OR p.gender = b.required_gender)
```

## 2) الواجهة الأمامية

### تسجيل المزود (`ProviderOnboarding.tsx` / `ProviderRegister.tsx`)
- إضافة حقل اختيار جنس إلزامي (RadioGroup ذكر/أنثى)
- منع إكمال البروفايل (`profile_completed=true`) بدون gender
- تحديث trigger `prevent_profile_privilege_escalation` ليتحقق من `gender NOT NULL`

### نافذة إكمال للمزودين القدامى
- في `ProviderDashboard.tsx`: عند `profile.gender IS NULL` → AlertDialog إلزامي قبل أي تفاعل

### نموذج العميل (`PatientForm.tsx`)
- موجود `provider_gender` ✓ — فقط نمرّره إلى `bookings.required_gender` في `BookingPage` و `create-guest-booking`

### دردشة محدودة بالسعر (`chatTemplates.ts`)
- تقليل أسئلة العميل إلى **5 فقط** (الأسئلة المحددة)
- ردود المزود **5 ردود** + كل رد يطلب إدخال سعر إجباري
- إزالة أي textarea حرة في `BookingChat.tsx` و `ProviderMessagesTab.tsx`

### مكوّن `ProviderResponsePicker`
- اختيار رد + Input للسعر (مطلوب) → ينحفظ في `booking_messages.quoted_price`

### عرض الردود في `CustomerOrderTracker` / `TrackOrderPage`
- جلب الردود مع: اسم المزود، جنسه، تخصصه، النص، السعر، الوقت
- استخدام `list_booking_messages` + JOIN بـ profile

### زر Release Gender (`BookingDetailsDrawer.tsx`)
- يظهر فقط للأدمن وعندما `required_gender IS NOT NULL AND NOT gender_released`
- AlertDialog تأكيد: "هل تؤكد موافقة العميل؟"
- ينادي RPC ويعرض toast

### فلترة قائمة المزودين عند الإسناد (`CSAssignmentDialog.tsx` / `BroadcastProvidersDialog.tsx`)
- فلتر الجنس + التخصص + احترام `gender_released`

## 3) أمان (PII)
- `containsPII` موجود ✓ — يُستخدم كطبقة دفاع إضافية

## ملاحظة
سيتم تنفيذ Migration أولاً (بعد موافقتك)، ثم كود الواجهة في رسالة واحدة بعد إقرار الـ migration.
