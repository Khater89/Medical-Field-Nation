import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { applyPendingProviderProfile, getPendingProviderProfileFromMetadata, PENDING_PROVIDER_PROFILE_KEY } from "@/lib/providerPendingProfile";
import mfnLogo from "@/assets/mfn-logo.png";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("role_type")
            .eq("user_id", session.user.id)
            .maybeSingle();

          const pending = localStorage.getItem(PENDING_PROVIDER_PROFILE_KEY);
          const metadataPending = getPendingProviderProfileFromMetadata(session.user.user_metadata as Record<string, any>);

          if (!existingProfile?.role_type && (pending || metadataPending)) {
            try {
              await applyPendingProviderProfile(session.user.id, pending || metadataPending!);
              localStorage.removeItem(PENDING_PROVIDER_PROFILE_KEY);
            } catch (pendingError) {
              console.error("Failed to apply pending provider profile:", pendingError);
            }
          } else if (pending) {
            localStorage.removeItem(PENDING_PROVIDER_PROFILE_KEY);
          }

          // Check roles to determine redirect
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);

          const isProvider = roles?.some((r) => r.role === "provider");
          const isAdmin = roles?.some((r) => r.role === "admin");
          const isCS = roles?.some((r) => r.role === "cs");

          if (isAdmin) {
            navigate("/admin", { replace: true });
          } else if (isCS) {
            navigate("/cs", { replace: true });
          } else if (isProvider) {
            // Approved providers go straight to their dashboard
            const { data: prof } = await supabase
              .from("profiles")
              .select("provider_status, profile_completed")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (prof?.provider_status === "approved") {
              if (prof?.profile_completed) {
                navigate("/provider", { replace: true });
              } else {
                navigate("/provider/onboarding", { replace: true });
              }
            } else {
              navigate("/account-review", { replace: true });
            }
          } else {
            // Check if this user has pending provider registration (role_type set)
            const { data: prof } = await supabase
              .from("profiles")
              .select("role_type, provider_status")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (prof?.role_type) {
              navigate("/account-review", { replace: true });
            } else {
              navigate("/", { replace: true });
            }
          }
        }
      }
    );

    // Check if there's already a session (token was auto-exchanged)
    supabase.auth.getSession().then(({ data: { session }, error: sessError }) => {
      if (sessError) {
        setError(sessError.message);
        return;
      }
      // If no session after a timeout, show error
      if (!session) {
        const timer = setTimeout(() => {
          setError("التحقق فشل. قد يكون الرابط منتهي الصلاحية.");
        }, 5000);
        return () => clearTimeout(timer);
      }
    });

    // Check URL for error params (e.g. expired link)
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const errDesc = params.get("error_description");
    if (errDesc) {
      setError(errDesc);
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResend = async () => {
    if (!email) {
      toast({ title: "أدخل بريدك الإلكتروني", variant: "destructive" });
      return;
    }
    setResending(true);
    const { error: resendErr } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (resendErr) {
      toast({ title: "خطأ", description: resendErr.message, variant: "destructive" });
    } else {
      toast({ title: "تم إرسال رابط التحقق مجدداً" });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <img src={mfnLogo} alt="MFN" className="h-12 mx-auto" />
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">فشل التحقق</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="أدخل بريدك الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
                dir="ltr"
              />
              <Button onClick={handleResend} disabled={resending} className="w-full gap-2">
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                إعادة إرسال رابط التحقق
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <img src={mfnLogo} alt="MFN" className="h-12 mx-auto" />
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">جارٍ التحقق من حسابك...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
