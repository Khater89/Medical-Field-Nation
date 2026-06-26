import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, ShoppingCart, Package } from "lucide-react";
import { useCart } from "@/contexts/MarketplaceCartContext";

export default function MarketplaceSubNav() {
  const { pathname } = useLocation();
  const { count } = useCart();

  const tabs = [
    { to: "/marketplace", label: "الرئيسية", icon: Store, exact: true },
    { to: "/marketplace/orders", label: "طلباتي", icon: Package, exact: false },
  ];

  return (
    <div className="border-b border-border/60 bg-card/40">
      <div className="container max-w-6xl h-12 flex items-center justify-between gap-2">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}>
                <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <Link to="/marketplace/cart">
          <Button variant="outline" size="sm" className="gap-1.5 relative">
            <ShoppingCart className="h-4 w-4" />
            السلة
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
