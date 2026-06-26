
-- Auto-grant 'vendor' role to owner when a marketplace_vendors row is created
CREATE OR REPLACE FUNCTION public.grant_vendor_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_user_id, 'vendor')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_vendor_role ON public.marketplace_vendors;
CREATE TRIGGER trg_grant_vendor_role
AFTER INSERT ON public.marketplace_vendors
FOR EACH ROW EXECUTE FUNCTION public.grant_vendor_role_on_insert();

-- Notify admin when a new vendor application is submitted
CREATE OR REPLACE FUNCTION public.notify_admin_new_vendor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_notifications (title, body, target_role)
  VALUES (
    '🏪 طلب تسجيل بائع جديد',
    'متجر جديد بانتظار المراجعة: ' || NEW.store_name || ' (' || NEW.vendor_type::text || ')',
    'admin'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_vendor ON public.marketplace_vendors;
CREATE TRIGGER trg_notify_admin_new_vendor
AFTER INSERT ON public.marketplace_vendors
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_vendor();

-- Seed marketplace categories (pharmacy / medical_devices / prosthetics)
INSERT INTO public.marketplace_categories (slug, name_ar, name_en, vendor_type, icon, sort_order) VALUES
  -- Pharmacy
  ('pharma-otc',          'أدوية بدون وصفة',        'OTC Medicines',           'pharmacy', '💊', 1),
  ('pharma-vitamins',     'فيتامينات ومكملات',      'Vitamins & Supplements',  'pharmacy', '🌿', 2),
  ('pharma-skincare',     'العناية بالبشرة',         'Skincare',                'pharmacy', '🧴', 3),
  ('pharma-baby',         'منتجات الأطفال',         'Baby Care',               'pharmacy', '👶', 4),
  ('pharma-personal',     'العناية الشخصية',         'Personal Care',           'pharmacy', '🧼', 5),
  ('pharma-medical-home', 'مستلزمات طبية منزلية',   'Home Medical Supplies',   'pharmacy', '🏥', 6),
  ('pharma-offers',       'عروض وبكجات',             'Offers & Bundles',        'pharmacy', '🎁', 7),
  -- Medical devices
  ('dev-eyes',            'أجهزة العيون',            'Eye Devices',             'medical_devices', '👁️', 1),
  ('dev-dental',          'أجهزة الأسنان',           'Dental Devices',          'medical_devices', '🦷', 2),
  ('dev-radiology',       'أجهزة الأشعة',            'Radiology Devices',       'medical_devices', '🩻', 3),
  ('dev-physio',          'تدليك وعلاج طبيعي',       'Massage & Physiotherapy', 'medical_devices', '💆', 4),
  ('dev-respiratory',     'أجهزة التنفس',            'Respiratory Devices',     'medical_devices', '🫁', 5),
  ('dev-vitals',          'قياس الضغط والسكر',       'BP & Glucose Monitors',   'medical_devices', '🩺', 6),
  ('dev-home-care',       'أجهزة العناية المنزلية',  'Home Care Devices',       'medical_devices', '🛏️', 7),
  ('dev-rehab',           'التأهيل والرعاية',        'Rehab & Care',            'medical_devices', '♿', 8),
  ('dev-other',           'أجهزة طبية أخرى',         'Other Medical Devices',   'medical_devices', '⚕️', 9),
  -- Prosthetics
  ('pros-upper',          'أطراف علوية',             'Upper Limb Prosthetics',  'prosthetics', '🦾', 1),
  ('pros-lower',          'أطراف سفلية',             'Lower Limb Prosthetics',  'prosthetics', '🦵', 2),
  ('pros-orthotics',      'أجهزة تقويم',             'Orthotics',               'prosthetics', '🦿', 3),
  ('pros-custom',         'تصنيع حسب القياس',        'Custom-made',             'prosthetics', '📐', 4),
  ('pros-accessories',    'ملحقات ومستلزمات',        'Accessories',             'prosthetics', '🔧', 5)
ON CONFLICT (slug) DO NOTHING;
