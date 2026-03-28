import { useLanguage } from "@/contexts/LanguageContext";
import { CATEGORY_CONFIG } from "@/lib/services";
import { cn } from "@/lib/utils";
import { Stethoscope, HeartPulse, Package } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Stethoscope,
  HeartPulse,
  Package,
};

interface CategoryTabsProps {
  selected: string;
  categories: string[];
  onChange: (cat: string) => void;
}

const CategoryTabs = ({ selected, categories, onChange }: CategoryTabsProps) => {
  const { lang } = useLanguage();

  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)` }}>
      {categories.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const Icon = config ? iconMap[config.icon] : null;
        const label = config
          ? lang === "ar" ? config.labelAr : config.labelEn
          : cat;
        const isActive = selected === cat;

        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
              isActive
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
            </div>
            <span
              className={cn(
                "text-xs font-semibold text-center leading-tight",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
