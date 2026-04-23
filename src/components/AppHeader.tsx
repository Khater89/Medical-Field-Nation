import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/booking/LanguageToggle";
import MFNLogo from "@/components/MFNLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  UserPlus,
  LogIn,
  ChevronDown,
  Menu,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const AppHeader = () => {
  const { t, isRTL } = useLanguage();
  const { user, profile, isAdmin, isCS, isProvider, isCustomer, signOut, loading } = useAuth();
  // Effective role prevents showing multiple dashboard links
  const effectiveRole = isAdmin ? "admin" : isCS ? "cs" : isProvider ? "provider" : "customer";
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const handleSignOut = async () => {
    await signOut();
    localStorage.clear();
    window.location.href = "/";
  };

  const displayName = profile?.full_name || user?.email || "";

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.services") || "الخدمات", href: "/#services" },
    { label: "تتبع طلبك", href: "/track" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="container max-w-6xl h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRTL ? "right" : "left"} className="w-72 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MFNLogo size={32} />
                    <span className="font-black text-sm brand-text">MEDICAL FIELD NATION</span>
                  </div>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                  <Link
                    to="/booking"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    {t("action.book_now")}
                  </Link>
                  {!user && (
                    <>
                      <Link
                        to="/auth"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <LogIn className="h-4 w-4" />
                        {t("landing.login")}
                      </Link>
                      <Link
                        to="/provider/register"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                        انضم كمزوّد
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <MFNLogo size={36} />
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="brand-text-animated font-black text-sm sm:text-base tracking-tight hidden sm:block"
            >
              MEDICAL FIELD NATION
            </motion.span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/booking">
            <Button size="sm" className="gap-1.5 ms-2 rounded-full px-5 font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/80 text-primary-foreground animate-pulse hover:animate-none">
              <CalendarCheck className="h-3.5 w-3.5" />
              {t("action.book_now")}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <LanguageToggle />

          {/* Mobile Book Now */}
          <Link to="/booking" className="md:hidden">
            <Button size="sm" className="rounded-full px-4 gap-1 text-xs font-semibold">
              {t("action.book_now")}
              <ArrowIcon className="h-3 w-3" />
            </Button>
          </Link>

          {user ? (
            <DropdownMenu>

              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs sm:text-sm max-w-[180px] rounded-full">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="truncate hidden sm:inline">{displayName}</span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                {effectiveRole === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    لوحة الإدارة
                  </DropdownMenuItem>
                )}
                {effectiveRole === "cs" && (
                  <DropdownMenuItem onClick={() => navigate("/cs")} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    لوحة خدمة العملاء
                  </DropdownMenuItem>
                )}
                {effectiveRole === "provider" && (
                  <DropdownMenuItem onClick={() => navigate("/provider")} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    لوحة مقدم الخدمة
                  </DropdownMenuItem>
                )}
                {effectiveRole === "customer" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      حسابي
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile?tab=bookings")} className="gap-2 cursor-pointer">
                      <CalendarCheck className="h-4 w-4" />
                      حجوزاتي
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" className="z-10">
              <Button
                size="lg"
                className="h-11 px-7 rounded-full bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground font-semibold tracking-tight text-sm shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.45)] hover:shadow-[0_8px_28px_-6px_hsl(var(--primary)/0.6)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-out"
              >
                {t("landing.login")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
