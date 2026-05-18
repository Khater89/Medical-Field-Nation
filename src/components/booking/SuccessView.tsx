import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, PartyPopper, Copy, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SuccessViewProps {
  onReset: () => void;
  bookingNumber?: string;
  customerPhone?: string;
}

const SuccessView = ({ onReset, bookingNumber, customerPhone }: SuccessViewProps) => {
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
      const msg = `📋 تفاصيل طلبي في MFN:\n\n🔢 رقم الطلب: ${bookingNumber}\n📌 الحالة: تم الإرسال بنجاح\n\n🔗 تتبع الطلب /الحجز الذاتي:\n${window.location.origin}/track`;
...
            تتبع الطلب /الحجز الذاتي
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-success border-success/30 hover:bg-success/10"
            onClick={shareViaWhatsApp}
          >
            <MessageCircle className="h-4 w-4" />
            أرسل لنفسك كمرجع
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
