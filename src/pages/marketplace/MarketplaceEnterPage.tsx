import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BackButton } from "@/components/ui/back-button";
import { UserRound, UserPlus, LogIn, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function MarketplaceEnterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [guestOpen, setGuestOpen] = useState(false);
  const [name, setName] = useState(localStorage.getItem("mp_guest_name") || "");
  const [phone, setPhone] = useState(localStorage.getItem("mp_guest_phone") || "");

  // Authenticated users skip the gate.
  useEffect(() => {
    if (!loading && user) navigate("/marketplace", { replace: true });
  }, [loading, user, navigate]);

  const enterAsGuest = () => {
    const trimmedName = name.trim();
    const digits = phone.replace(/\D+/g, "");
    if (trimmedName.length < 2) return toast.error("الاسم الكامل مطلوب");
    if (digits.length < 9) return toast.error("رقم هاتف غير صحيح");
    localStorage.setItem("mp_guest_name", trimmedName);
    localStorage.setItem("mp_guest_phone", phone.trim());
    setGuestOpen(false);
    toast.success("مرحبًا بك في السوق الطبي");
    navigate("/marketplace");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-3xl py-8">
        <BackButton to="/" />
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-4">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">السوق الطبي</h1>
          <p className="text-muted-foreground">اختر طريقة الدخول للمتابعة</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => setGuestOpen(true)}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 items-center justify-center mb-3">
              <UserRound className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">دخول كزائر</h3>
            <p className="text-xs text-muted-foreground">بالاسم ورقم الهاتف فقط</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=signup&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 items-center justify-center mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">تسجيل حساب جديد</h3>
            <p className="text-xs text-muted-foreground">احفظ رسائلك وطلباتك</p>
          </Card>

          <Card
            className="p-6 cursor-pointer hover:border-primary hover:shadow-lg transition-all text-center"
            onClick={() => navigate("/auth?mode=login&redirect=/marketplace")}
          >
            <div className="inline-flex w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 items-center justify-center mb-3">
              <LogIn className="w-6 h-6" />
            </div>
            <h3 className="font-semibold mb-1">تسجيل الدخول</h3>
            <p className="text-xs text-muted-foreground">إلى حسابي الموجود</p>
          </Card>
        </div>
      </div>

      <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الدخول كزائر</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك الكامل" />
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                inputMode="tel"
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيُستخدم رقم هاتفك لربط محادثاتك وطلباتك في السوق الطبي.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestOpen(false)}>إلغاء</Button>
            <Button onClick={enterAsGuest}>متابعة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
