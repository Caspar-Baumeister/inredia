"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROOM_LABELS, ROOM_TYPES, type RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deletePhotoAction, registerPhotoAction, updateRoomAction, type RegisteredPhoto } from "./actions";

export type UploadedPhoto = RegisteredPhoto & { roomType: RoomType; localUrl: string };

export function UploadStep({
  userId,
  projectId,
  photos,
  onChange,
}: {
  userId: string;
  projectId: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
}) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<{ name: string; message: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files).filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type));
    if (!list.length) {
      setError("Please use JPG, PNG or WebP photos.");
      return;
    }
    const sb = getSupabaseBrowserClient();
    let current = photos;
    for (const file of list) {
      setBusy((b) => b + 1);
      try {
        const { width, height } = await readDimensions(file);
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${projectId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await sb.storage.from("originals").upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        const result = await registerPhotoAction({ projectId, storagePath: path, width, height, sortOrder: current.length });
        if (!result.ok) {
          setRejected((r) => [...r, { name: file.name, message: result.message }]);
          continue;
        }
        const localUrl = URL.createObjectURL(file);
        current = [...current, { ...result.photo, roomType: (result.photo.detected.room_type ?? "other") as RoomType, localUrl }];
        onChange(current);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }

  async function setRoomType(p: UploadedPhoto, type: RoomType) {
    onChange(photos.map((x) => (x.photoId === p.photoId ? { ...x, roomType: type } : x)));
    await updateRoomAction({ roomId: p.roomId, type });
  }

  async function remove(p: UploadedPhoto) {
    onChange(photos.filter((x) => x.photoId !== p.photoId));
    await deletePhotoAction(p.photoId);
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors",
          dragging ? "border-brand bg-brand-soft" : "hover:border-foreground/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-muted">
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        </div>
        <p className="font-medium">{busy ? `Uploading & analysing ${busy} photo${busy > 1 ? "s" : ""}…` : "Drop room photos here"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Empty rooms only, one photo per room works best. JPG, PNG or WebP, up to 20 MB.</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {rejected.map((r, i) => (
        <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <p>
            <span className="font-medium">{r.name}</span> — {r.message}
          </p>
          <button onClick={() => setRejected((x) => x.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:underline">
            dismiss
          </button>
        </div>
      ))}

      {photos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {photos.map((p) => (
            <div key={p.photoId} className="overflow-hidden rounded-xl border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.localUrl || p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Looks like a {ROOM_LABELS[p.roomType].toLowerCase()}</p>
                  <button onClick={() => remove(p)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Remove">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ROOM_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setRoomType(p, t)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        p.roomType === t ? "border-foreground bg-foreground text-white" : "hover:bg-muted",
                      )}
                    >
                      {ROOM_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}
