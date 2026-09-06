import { MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";

export function FeedbackCard({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={SITE.xUrl}
      target="_blank"
      rel="noreferrer"
      className={compact ? "block rounded-xl border bg-card px-3 py-3 hover:bg-muted/60" : "block rounded-xl border bg-card p-5 card-shadow hover:bg-muted/40"}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle size={16} className="text-brand" /> Feedback &amp; bugs
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        inredia is built by one person ({SITE.founder}). Found a bug, have a wish, or just want to say hi? Message me on X{" "}
        <span className="font-medium text-brand">{SITE.xHandle}</span> — I read everything.
      </p>
    </a>
  );
}
