import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export default function AcknowledgementDialog({
  open, onOpenChange, title, text, confirmLabel, cancelLabel = "إلغاء", loading, onConfirm,
}: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setAgreed(false); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-3">
          <p className="text-sm leading-7 whitespace-pre-line text-foreground">{text}</p>
        </ScrollArea>
        <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border bg-muted/30 p-3">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(Boolean(v))} className="mt-0.5" />
          <span className="text-sm">قرأت النص أعلاه وأوافق عليه.</span>
        </label>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>{cancelLabel}</Button>
          <Button onClick={() => onConfirm()} disabled={!agreed || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const CUSTOMER_ORDER_ACK_TEXT = `أقرّ بأن هذه المنصة تعمل كوسيط إلكتروني بيني وبين الجهة البائعة (الصيدلية / المورد / المركز)، وأن مسؤولية توفر المنتج، صحة بياناته، تسليمه، جودته، صلاحيته، واستخدامه تقع على الجهة البائعة حسب القوانين والتعليمات المعمول بها.

كما أقرّ بأنني قمت بمراجعة بيانات المنتج والسعر وطريقة الاستلام أو التوصيل قبل تثبيت الطلب، وأوافق على متابعة عملية الشراء من خلال المنصة.`;

export const VENDOR_ACCEPT_ACK_TEXT = `أقرّ بصفتي الجهة البائعة بأنني مسؤول مسؤولية كاملة عن صحة بيانات المنتجات المعروضة، وتوفرها، وجودتها، وسلامتها، وصلاحيتها، وتسليمها للعميل حسب البيانات المعروضة داخل المنصة.

كما أقرّ بأن المنصة تعمل كوسيط إلكتروني لتنظيم عملية التواصل والشراء، ولا تتحمل مسؤولية أي بيانات غير صحيحة أو منتجات غير مطابقة أو مخالفة يتم إدخالها أو بيعها من قبلي.

وأوافق على تحمل المسؤولية الكاملة عن الطلب بعد قبوله، وأوافق على سياسة نسب المنصة والعمولات المعتمدة (النسبة الأساسية 10٪ من كل عملية بيع، ويمكن أن ترتفع إلى 20٪ عند تحقق شرط زيادة المبيعات بنسبة 15٪ حسب فترة القياس التي تحددها الإدارة).`;
