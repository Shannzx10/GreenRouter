"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CodeBlock({
  title,
  code,
}: {
  title?: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard tidak tersedia (konteks tidak aman) — abaikan.
    }
  }

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-2.5">
        <span className="font-mono text-xs text-zinc-400">{title ?? "kode"}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-200"
        >
          {copied ? <Check size={13} className="text-lime-300" /> : <Copy size={13} />}
          {copied ? "Disalin" : "Salin"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-black/50 px-5 py-4 font-mono text-[12.5px] leading-relaxed text-zinc-200">
        {code}
      </pre>
    </div>
  );
}
