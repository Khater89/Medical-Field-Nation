import { FileText, Download } from "lucide-react";

export default function ChatAttachment({ url, type, name }: { url: string; type?: string | null; name?: string | null }) {
  const isImage = (type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|heic)$/i.test(url);
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block mt-1">
        <img src={url} alt={name || "attachment"} className="max-h-48 rounded-lg border" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="mt-1 flex items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5 text-xs hover:bg-background">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1">{name || "ملف مرفق"}</span>
      <Download className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}
