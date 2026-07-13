import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const MCP_URL = `https://${projectRef}.supabase.co/functions/v1/mcp`;

export default function ConnectPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          الرئيسية
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">اربط مساعدك الذكي بـ MFN</h1>
          <p className="text-muted-foreground">
            استخدم الرابط أدناه لربط ChatGPT أو Claude بمنصة MFN للبحث عن الخدمات، تتبع الطلبات،
            وتصفح متاجر السوق الطبي.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">رابط خادم MCP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm break-all">
              {MCP_URL}
            </div>
            <Button onClick={copy} className="w-full sm:w-auto gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "تم النسخ" : "نسخ الرابط"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ChatGPT</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal ps-5 space-y-2 text-sm leading-relaxed">
              <li>
                افتح{" "}
                <a
                  href="https://chatgpt.com/#settings/Connectors/Advanced"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  إعدادات الموصلات في ChatGPT
                </a>{" "}
                وفعّل وضع المطور (Developer mode) مع الانتباه لتنبيه المخاطر.
              </li>
              <li>من قائمة "+" في مربع المحادثة، فعّل Developer mode.</li>
              <li>اضغط "Add sources" ثم "Connect more".</li>
              <li>أدخل اسمًا للموصل والصق الرابط أعلاه.</li>
              <li>اطلب من ChatGPT استخدام MFN.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claude</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal ps-5 space-y-2 text-sm leading-relaxed">
              <li>
                افتح{" "}
                <a
                  href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  صفحة إضافة موصل مخصص في Claude
                </a>
                .
              </li>
              <li>أدخل اسمًا للموصل والصق الرابط أعلاه.</li>
              <li>فعّل الموصل من مربع المحادثة، ثم اطلب من Claude استخدام MFN.</li>
            </ol>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          سيطلب منك المساعد تسجيل الدخول إلى حسابك في MFN عند أول اتصال.
        </p>
      </div>
    </div>
  );
}
