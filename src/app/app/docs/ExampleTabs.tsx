"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export type Example = {
  id: string;
  label: string;
  title: string;
  code: string;
};

/** Panel contoh kode bertab, meniru showcase di landing page. */
export default function ExampleTabs({ examples }: { examples: Example[] }) {
  const [active, setActive] = useState(examples[0]?.id ?? "");
  const [copied, setCopied] = useState(false);
  const current = examples.find((e) => e.id === active) ?? examples[0];

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard tidak tersedia, tombol tetap berlabel "Salin".
    }
  }

  if (!current) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.03] px-3 py-2">
        <div role="tablist" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {examples.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === active}
              onClick={() => setActive(e.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
                e.id === active
                  ? "bg-lime-400 font-semibold text-zinc-950"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-200"
        >
          {copied ? <Check size={13} className="text-lime-300" /> : <Copy size={13} />}
          {copied ? "Disalin" : "Salin"}
        </button>
      </div>
      <p className="border-b border-white/[0.06] px-4 py-2 font-mono text-xs text-zinc-500 sm:px-5">
        {current.title}
      </p>
      <pre className="overflow-x-auto px-4 py-4 sm:px-5 font-mono text-[12.5px] leading-relaxed text-zinc-200">
        {current.code}
      </pre>
    </div>
  );
}
