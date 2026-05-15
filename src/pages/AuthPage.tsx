import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { lovable } from "@/integrations/lovable/index";
import mfnLogo from "@/assets/mfn-logo.png";

const AuthPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, isCS, isProvider, loading: authLoading, rolesLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Redirect if already logged in and roles are loaded
  useEffect(() => {
    if (!authLoading && user && rolesLoaded) {
      // Priority: admin > cs > provider > customer
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else if (isCS) {
        navigate("/cs", { replace: true });
      } else if (isProvider) {
        navigate("/provider", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, isAdmin, isCS, isProvider, authLoading, rolesLoaded, navigate]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendVerification = async (email: string) => {
    setResendingEmail(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendingEmail(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم إرسال رابط التحقق", description: "تحقق من بريدك الإلكتروني" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (error) {
        const isUnconfirmed = error.message?.toLowerCase().includes("email not confirmed");
        if (isUnconfirmed) {
          toast({
            title: "البريد الإلكتروني غير مؤكد",
            description: "يرجى التحقق من بريدك الإلكتروني أولاً. تحقق من صندوق الوارد.",
            variant: "destructive",
            action: (
              <Button
                variant="outline"
                size="sm"
                disabled={resendingEmail}
                onClick={() => handleResendVerification(loginEmail.trim())}
              >
                {resendingEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : "إعادة إرسال"}
              </Button>
            ),
          });
        } else if (error.message?.toLowerCase().includes("invalid login credentials")) {
          toast({
            title: "خطأ في تسجيل الدخول",
            description: "بيانات الدخول غير صحيحة. إذا سجّلت عبر Google أو Apple، استخدم الزر المناسب أدناه.",
            variant: "destructive",
          });
        } else {
          toast({ title: "خطأ في تسجيل الدخول", description: error.message, variant: "destructive" });
        }
      } else {
        console.log("Login successful, resolving role and redirecting...");
        toast({ title: "تم تسجيل الدخول بنجاح" });
        // Direct navigation — don't wait for AuthProvider race
        const { data: { user: authedUser } } = await supabase.auth.getUser();
        if (authedUser) {
          const { data: roles } = await supabase
            .from("user_roles").select("role").eq("user_id", authedUser.id);
          const isAdminR = roles?.some((r) => r.role === "admin");
          const isCSR = roles?.some((r) => r.role === "cs");
          const isProviderR = roles?.some((r) => r.role === "provider");
          if (isAdminR) navigate("/admin", { replace: true });
          else if (isCSR) navigate("/cs", { replace: true });
          else if (isProviderR) {
            const { data: prof } = await supabase
              .from("profiles").select("provider_status, profile_completed")
              .eq("user_id", authedUser.id).maybeSingle();
            if (prof?.provider_status === "approved") {
              navigate(prof?.profile_completed ? "/provider" : "/provider/onboarding", { replace: true });
            } else {
              navigate("/account-review", { replace: true });
            }
          } else navigate("/", { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Unexpected login error:", err);
      toast({ title: "خطأ غير متوقع", description: err?.message || "حدث خطأ أثناء تسجيل الدخول", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: signupName.trim() },
        },
      });
      
      if (error) {
        toast({ title: "خطأ في التسجيل", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "تم التسجيل بنجاح!", description: "تحقق من بريدك الإلكتروني لتأكيد الحساب" });
      }
    } catch (err: any) {
      console.error("Unexpected signup error:", err);
      toast({ title: "خطأ غير متوقع", description: err?.message || "حدث خطأ أثناء التسجيل", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "خطأ في تسجيل الدخول بـ Google", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
    // On success the page will redirect, no need to reset loading
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "خطأ في تسجيل الدخول بـ Apple", description: error.message, variant: "destructive" });
      setAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/">
            <img src={mfnLogo} alt="MFN" className="h-12 mx-auto mb-4 hover:opacity-80 transition-opacity" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Medical Field Nation</h1>
          <p className="text-sm text-muted-foreground mt-1">خدمات طبية ميدانية احترافية</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">الدخول إلى حسابك</CardTitle>
            <CardDescription className="text-center">سجل دخولك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                  <Input
                    type="password"
                    placeholder="كلمة المرور"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    تسجيل الدخول
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                      نسيت كلمة المرور؟
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <Input
                    placeholder="الاسم الكامل"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    dir="ltr"
                  />
                  <Input
                    type="password"
                    placeholder="كلمة المرور (6 أحرف على الأقل)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                    dir="ltr"
                  />
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    إنشاء حساب (مستخدم)
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    هل أنت مقدم خدمة طبية؟{" "}
                    <Link to="/provider/register" className="text-primary hover:underline font-medium">
                      سجّل كمقدم خدمة
                    </Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-5">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                أو
              </span>
            </div>

            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5"
                disabled={googleLoading || loading}
                onClick={handleGoogleSignIn}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                تسجيل الدخول بـ Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2.5"
                disabled={appleLoading || loading}
                onClick={handleAppleSignIn}
              >
                {appleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                تسجيل الدخول بـ Apple
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Link to="/" className="text-sm text-primary hover:underline">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
