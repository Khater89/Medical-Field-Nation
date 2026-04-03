import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, PartyPopper, Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SuccessViewProps {
  onReset: () => void;
  bookingNumber?: string;
}

const SuccessView = ({ onReset, bookingNumber }: SuccessViewProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const copyBookingNumber = () => {
    if (bookingNumber) {
      navigator.clipboard.writeText(bookingNumber);
      toast({ title: "تم النسخ ✓" });
    }
  };

  const shareViaWhatsApp = () => {
    if (bookingNumber) {
      const msg = `📋 تفاصيل طلبي في MFN:\n\n🔢 رقم الطلب: ${bookingNumber}\n📌 الحالة: تم الإرسال بنجاح\n\n🔗 تتبع الطلب:\n${window.location.origin}/track`;
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 space-y-8">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative"
      >
        <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-success" />
        </div>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
          className="absolute -top-2 -end-2 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <PartyPopper className="h-4 w-4 text-primary" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="space-y-3"
      >
        <h2 className="text-2xl sm:text-3xl font-black text-foreground">
          {t("status.success")}
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {t("status.success.desc")}
        </p>
      </motion.div>

      {/* Booking Number */}
      {bookingNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="w-full max-w-xs"
        >
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">{t("booking.number")}</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl font-black text-primary tracking-wider" dir="ltr">
                {bookingNumber}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyBookingNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">{t("booking.number.note")}</p>
          </div>
        </motion.div>
      )}

      {/* Track Order Link */}
      {bookingNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate("/track")}
          >
            <Search className="h-4 w-4" />
            تتبع طلبك
          </Button>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Button onClick={onReset} size="lg" className="rounded-full px-8 font-semibold gap-2 shadow-md hover:shadow-lg transition-shadow">
          {t("action.book_now")}
        </Button>
      </motion.div>
    </div>
  );
};

export default SuccessView;
