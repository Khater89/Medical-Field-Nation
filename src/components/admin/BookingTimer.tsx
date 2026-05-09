import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Activity, CalendarClock } from "lucide-react";

interface Props {
  scheduledAt: string;
  status: string;
  checkInAt?: string | null;
}

function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

/**
 * Live timer badge for admin BookingsTab.
 * - Green: > 1h remaining
 * - Yellow (pulse): < 1h until appointment
 * - Blue: in-progress / checked-in
 * - Red (pulse): provider late (past scheduled time, no check-in)
 */
export default function BookingTimer({ scheduledAt, status, checkInAt }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Don't show timer for finished / cancelled
  if (["COMPLETED", "CANCELLED", "REJECTED"].includes(status)) return null;

  const scheduled = new Date(scheduledAt).getTime();
  const diff = scheduled - now; // positive = future, negative = past

  // In progress (provider checked in)
  if (checkInAt || status === "IN_PROGRESS" || status === "PROVIDER_ON_THE_WAY") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-chart-4/10 text-chart-4 border-chart-4/30">
        <Activity className="h-3 w-3" />
        في وقت التنفيذ
      </Badge>
    );
  }

  // Late (past scheduled and not started)
  if (diff < 0) {
    const lateBy = formatRemaining(diff);
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-destructive/15 text-destructive border-destructive/40 animate-pulse">
        <AlertTriangle className="h-3 w-3" />
        المزود متأخر {lateBy}
      </Badge>
    );
  }

  // Within 1 hour — "appointment soon"
  if (diff <= 60 * 60 * 1000) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 bg-warning/15 text-warning border-warning/40 animate-pulse">
        <CalendarClock className="h-3 w-3" />
        موعد الطلب قريب — متبقي {formatRemaining(diff)}
      </Badge>
    );
  }

  // Future
  return (
    <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 text-success border-success/30">
      <Clock className="h-3 w-3" />
      متبقي {formatRemaining(diff)}
    </Badge>
  );
}
