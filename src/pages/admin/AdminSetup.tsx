import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import mfnLogo from "@/assets/mfn-logo.png";

const AdminSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, refreshUserData } = useAuth();
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/auth");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-setup", {
      body: { secret: secret.trim() },
    });
    setLoading(false);

    if (error || data?.error) {
      toast({
        title: "فشل الإعداد",
        description: data?.error || error?.message || "تحقق من مفتاح الإعداد",
        variant: "destructive",
      });
    } else {
      await refreshUserData();
      toast({ title: "تم إعداد الأدمن بنجاح! 🎉" });
      navigate("/admin");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={mfnLogo} alt="MFN" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">إعداد الأدمن</h1>
          <p className="text-sm text-muted-foreground mt-1">أدخل مفتاح الإعداد لتفعيل صلاحيات الإدارة</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              إعداد لمرة واحدة
            </CardTitle>
            <CardDescription>
              هذه العملية متاحة مرة واحدة فقط. ستتم ترقية حسابك الحالي ({user.email}) إلى أدمن.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <PasswordInput
                placeholder="مفتاح الإعداد (ADMIN_SETUP_SECRET)"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                required
                dir="ltr"
              />
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                تفعيل صلاحيات الأدمن
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSetup;
