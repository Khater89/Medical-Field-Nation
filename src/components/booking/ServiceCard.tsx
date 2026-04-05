import { useLanguage } from "@/contexts/LanguageContext";
import type { DbService } from "@/hooks/useServices";
import { cn } from "@/lib/utils";
import {
  Stethoscope,
  UserRound,
  ClipboardCheck,
  Syringe,
  HeartPulse,
  Activity,
  CircleDot,
  Dumbbell,
  Accessibility,
  TestTube,
  FlaskConical,
  Check,
  Bone,
  Scissors,
  Clock,
  ScanLine,
  Ambulance,
  Package,
  Droplets,
  Droplet,
  Footprints,
  ShieldCheck,
  Pipette,
  Siren,
  Briefcase,
} from "lucide-react";

// Map service names to icons for visual variety
const SERVICE_ICON_MAP: Record<string, React.ElementType> = {
  "طب عام": Stethoscope,
  "طوارئ": Siren,
  "كسور": Bone,
  "تخييط": Scissors,
  "تمريض": HeartPulse,
  "كبار السن": UserRound,
  "مرافق": Clock,
  "علاج طبيعي": Dumbbell,
  "أشعة": ScanLine,
  "نقل": Ambulance,
  "أجهزة": Package,
  "محاليل": Droplets,
  "حقن": Syringe,
  "علامات حيوية": Activity,
  "سكر": Droplet,
  "قدم سكري": Footprints,
  "غيارات": ClipboardCheck,
  "عمليات": ShieldCheck,
  "قسطرة": CircleDot,
  "أنبوب": Pipette,
  "عينات": TestTube,
  "شرجية": FlaskConical,
};

function getIconForService(name: string): React.ElementType {
  for (const [keyword, icon] of Object.entries(SERVICE_ICON_MAP)) {
    if (name.includes(keyword)) return icon;
  }
  return Briefcase;
}

interface ServiceCardProps {
  service: DbService;
  isSelected: boolean;
  onSelect: (service: DbService) => void;
}

const ServiceCard = ({ service, isSelected, onSelect }: ServiceCardProps) => {
  const { t } = useLanguage();
  const Icon = getIconForService(service.name);

  return (
    <button
      onClick={() => onSelect(service)}
      className={cn(
        "relative w-full text-start p-4 rounded-xl border-2 transition-all duration-200 group",
        isSelected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md"
      )}
    >
      {isSelected && (
        <div className="absolute top-3 end-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-11 w-11 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isSelected
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground">{service.name}</h4>
          {service.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

export default ServiceCard;
