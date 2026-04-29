import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import MFNLogo from "@/components/MFNLogo";
import { Mail, MapPin } from "lucide-react";

const AppFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card/60 backdrop-blur-sm">
      <div className="container max-w-6xl py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <MFNLogo size={32} />
              <span className="font-black text-sm brand-text">MFN</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("app.tagline")}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">
              {t("landing.footer.quickLinks") || "روابط سريعة"}
            </h4>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t("nav.home")}
              </Link>
              <Link to="/booking" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {t("action.book_now")}
              </Link>
              <Link to="/provider/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                انضم كمزوّد
              </Link>
            </nav>
          </div>

          {/* Contact (no call/whatsapp icons — appear after booking only) */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">
              {t("landing.footer.contact") || "تواصل معنا"}
            </h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/track" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span>تتبع طلبك للتواصل بالمنسق</span>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>الأردن</span>
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-foreground">
              {t("landing.feature4")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("landing.feature4.desc")}
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {t("app.name")}. {t("landing.footer.rights")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("app.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default AppFooter;
