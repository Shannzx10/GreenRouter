"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Jendela kode bergaya terminal: tiga titik, judul, tombol salin dengan umpan balik.
export default function CodeBlock({
  title,
  code,
}: {
  title?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            <i className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
            <i className="h-2.5 w-2.5 rounded-full bg-lime-400/70" />
          </span>
          <span className="truncate font-mono text-xs text-zinc-400">{title ?? "kode"}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 outline-none transition hover:border-lime-300/40 hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300/60"
        >
          {copied ? <Check size={13} className="text-lime-300" /> : <Copy size={13} />}
          {copied ? "Disalin" : failed ? "Gagal, salin manual" : "Salin"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed text-zinc-200 sm:px-5">
        {code}
      </pre>
    </div>
  );
}
