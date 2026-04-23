import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

interface SmartDobPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SmartDobPicker = ({ value, onChange }: SmartDobPickerProps) => {
  const { isRTL } = useLanguage();
  const months = isRTL ? MONTHS_AR : MONTHS_EN;

  const currentYear = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 70 }, (_, i) => currentYear - 18 - i),
    [currentYear]
  );

  // Local state preserves partial selections so user can see what's missing
  const initialParts = value ? value.split("-") : [];
  const [y, setY] = useState(initialParts[0] || "");
  const [m, setM] = useState(initialParts[1] || "");
  const [d, setD] = useState(initialParts[2] || "");

  // Sync if parent resets value externally
  useEffect(() => {
    const p = value ? value.split("-") : [];
    setY(p[0] || "");
    setM(p[1] || "");
    setD(p[2] || "");
  }, [value]);

  const daysInMonth = useMemo(() => {
    if (!y || !m) return 31;
    return new Date(parseInt(y), parseInt(m), 0).getDate();
  }, [y, m]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const emit = (newY: string, newM: string, newD: string) => {
    if (newY && newM && newD) {
      onChange(`${newY}-${newM.padStart(2, "0")}-${newD.padStart(2, "0")}`);
    } else {
      onChange("");
    }
  };

  const isComplete = !!(y && m && d);
  const triggerClass = `h-11 ${isComplete ? "border-success focus-visible:ring-success/30" : ""}`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Select value={y} onValueChange={(v) => { setY(v); emit(v, m, d); }}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder={isRTL ? "السنة" : "Year"} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={m} onValueChange={(v) => { setM(v); emit(y, v, d); }}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder={isRTL ? "الشهر" : "Month"} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {months.map((mn, idx) => (
              <SelectItem key={idx} value={String(idx + 1).padStart(2, "0")}>
                {mn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={d} onValueChange={(v) => { setD(v); emit(y, m, v); }}>
          <SelectTrigger className={triggerClass}>
            <SelectValue placeholder={isRTL ? "اليوم" : "Day"} />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {days.map((day) => (
              <SelectItem key={day} value={String(day).padStart(2, "0")}>
                {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!isComplete && (y || m || d) && (
        <p className="text-xs text-destructive">
          {isRTL ? "يرجى اختيار السنة والشهر واليوم معاً" : "Please select Year, Month, and Day"}
        </p>
      )}
    </div>
  );
};

export default SmartDobPicker;
