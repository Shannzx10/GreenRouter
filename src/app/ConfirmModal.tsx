"use client";

import { Loader2, type LucideIcon } from "lucide-react";

// Modal konfirmasi kustom pengganti confirm() bawaan browser, tampilannya
// mengikuti modal rotate key dan logout. tone "danger" untuk tindakan
// destruktif (tombol merah), "lime" untuk tindakan penting biasa.
export default function ConfirmModal({
  icon: Icon,
  title,
  description,
  confirmLabel,
  tone = "lime",
  busy = false,
  onCancel,
  onConfirm,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "lime" | "danger";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = tone === "danger";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => !busy && onCancel()}
    >
      <div className="glass w-full max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${
            danger
              ? "bg-red-500/10 text-red-300 ring-red-400/25"
              : "bg-lime-400/10 text-lime-300 ring-lime-300/25"
          }`}
        >
          <Icon size={19} />
        </span>
        <h2 className="mt-3.5 text-base font-semibold">{title}</h2>
        <div className="mt-1.5 text-sm leading-relaxed text-zinc-400">{description}</div>
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full border border-white/12 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-950 transition disabled:opacity-60 ${
              danger ? "bg-red-400 hover:bg-red-300" : "bg-lime-400 hover:bg-lime-300"
            }`}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
