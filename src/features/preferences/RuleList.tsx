"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeRuleAction } from "@/features/dashboard/actions";
import { useRouter } from "next/navigation";

export function RuleList({ rules }: { rules: { id: string; text: string; source: string; scoped: boolean }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!rules.length) return <p className="text-sm text-muted-foreground">No rules yet.</p>;
  return (
    <ul className="space-y-2">
      {rules.map((r) => (
        <li key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <span>
            avoid {r.text}
            <span className="ml-2 text-xs text-muted-foreground">
              {r.source === "swipe" ? "from swipes" : "from chat"}
              {r.scoped ? " · this room" : ""}
            </span>
          </span>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await removeRuleAction(r.id);
                router.refresh();
              })
            }
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Remove rule"
          >
            <X size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
