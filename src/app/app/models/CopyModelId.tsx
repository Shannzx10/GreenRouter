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
      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 font-mono text-xs text-zinc-500 transition hover:bg-white/[0.05] hover:text-lime-200"
      title="Salin ID model"
    >
      {copied ? <Check size={12} className="text-lime-300" /> : <Copy size={12} />}
      {copied ? "Disalin" : "Salin ID"}
    </button>
  );
}
