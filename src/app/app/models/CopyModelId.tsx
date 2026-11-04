"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyModelId({ modelId }: { modelId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(modelId);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard tidak tersedia, abaikan.
        }
      }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-xs text-zinc-400 outline-none transition hover:border-lime-300/40 hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300/60"
      title="Salin ID model"
      aria-label={`Salin ID model ${modelId}`}
    >
      {copied ? <Check size={12} className="text-lime-300" /> : <Copy size={12} />}
      {copied ? "Disalin" : "Salin ID"}
    </button>
  );
}
