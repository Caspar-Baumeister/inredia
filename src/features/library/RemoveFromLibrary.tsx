"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removeFromLibraryAction } from "./actions";

export function RemoveFromLibrary({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => removeFromLibraryAction(id))}
      disabled={pending}
      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-danger disabled:opacity-50"
      aria-label="Remove from library"
    >
      <Trash2 size={14} />
    </button>
  );
}
