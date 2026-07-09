import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, ShoppingCart, Package, MessagesSquare } from "lucide-react";
import { useCart } from "@/contexts/MarketplaceCartContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MarketplaceSubNav() {
  const { pathname } = useLocation();
  const { count } = useCart();
  const { t } = useLanguage();

  const tabs = [
    { to: "/marketplace", label: t("mp.nav.home"), icon: Store, exact: true },
    { to: "/marketplace/my-messages", label: t("mp.nav.my_messages"), icon: MessagesSquare, exact: false },
    { to: "/marketplace/orders", label: t("mp.nav.my_orders"), icon: Package, exact: false },
  ];

  return (
    <div className="border-b border-border/60 bg-card/40">
      <div className="container max-w-6xl h-12 flex items-center justify-between gap-2">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <Link key={tab.to} to={tab.to}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <Link to="/marketplace/cart">
          <Button variant="outline" size="sm" className="gap-1.5 relative">
            <ShoppingCart className="h-4 w-4" />
            {t("mp.nav.cart")}
            {count > 0 && (
              <Badge className="absolute -top-2 -end-2 h-5 min-w-5 px-1 rounded-full text-[10px]">
                {count}
              </Badge>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}
