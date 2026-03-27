import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, PartyPopper, Copy, Search, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface BankInfo {
  bank_name: string | null;
  bank_iban: string | null;
  bank_cliq_alias: string | null;
  bank_account_holder: string | null;
}

interface SuccessViewProps {
  onReset: () => void;
  bookingNumber?: string;
}

const SuccessView = ({ onReset, bookingNumber }: SuccessViewProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [loadingBank, setLoadingBank] = useState(true);

  useEffect(() => {
    const fetchBank = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setBankInfo({
          bank_name: (data as any).bank_name,
          bank_iban: (data as any).bank_iban,
          bank_cliq_alias: (data as any).bank_cliq_alias,
          bank_account_holder: (data as any).bank_account_holder,
        });
      }
      setLoadingBank(false);
    };
    fetchBank();
  }, []);

  const copyBookingNumber = () => {
    if (bookingNumber) {
      navigator.clipboard.writeText(bookingNumber);
      toast({ title: "تم النسخ ✓" });
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ ✓" });
  };

  const hasBankInfo = bankInfo && (bankInfo.bank_iban || bankInfo.bank_cliq_alias);

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

      {/* CliQ / Bank Payment Info */}
      {loadingBank ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : hasBankInfo ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 space-y-3 text-start">
            <div className="flex items-center gap-2 justify-center">
              <Landmark className="h-5 w-5 text-primary" />
              <p className="font-bold text-sm text-foreground">ادفع عبر CliQ / تحويل بنكي</p>
            </div>

            {bankInfo.bank_account_holder && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">صاحب الحساب</span>
                <span className="font-medium">{bankInfo.bank_account_holder}</span>
              </div>
            )}
            {bankInfo.bank_name && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">البنك</span>
                <span className="font-medium">{bankInfo.bank_name}</span>
              </div>
            )}
            {bankInfo.bank_iban && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">IBAN</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(bankInfo.bank_iban!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs font-mono bg-muted rounded px-2 py-1.5 break-all" dir="ltr">
                  {bankInfo.bank_iban}
                </p>
              </div>
            )}
            {bankInfo.bank_cliq_alias && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">CliQ Alias</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-medium" dir="ltr">{bankInfo.bank_cliq_alias}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(bankInfo.bank_cliq_alias!)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              يرجى ذكر رقم الحجز في ملاحظات التحويل
            </p>
          </div>
        </motion.div>
      ) : null}

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
