"use client";

import { useMemo, useRef, useState } from "react";
import {
  Brain,
  Braces,
  Eye,
  FileText,
  Mic,
  Paperclip,
  RotateCcw,
  Search,
  Sparkles,
  Type,
  Video,
  Wrench,
  X,
} from "lucide-react";
import ProviderIcon, { familyLabel, modelFamily } from "../../ProviderIcon";
import CopyModelId from "./CopyModelId";
import { Spot } from "../../landing/Interactive";

export type CatalogModel = {
  id: string;
  modelId: string;
  displayName: string;
  active: boolean;
  earlyAccess: boolean;
  contextTokens: number | null;
  maxOutputTokens: number | null;
  knowledgeCutoff: string | null;
  modalities: string[];
  capabilities: string[];
};

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function fmtTokens(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fmtCutoff(v: string | null): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})$/);
  if (!m) return v;
  const month = MONTHS_ID[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : v;
}

const MOD_META: Record<string, { icon: typeof Type; label: string }> = {
  text: { icon: Type, label: "Teks" },
  image: { icon: Eye, label: "Vision" },
  video: { icon: Video, label: "Video" },
  pdf: { icon: FileText, label: "PDF" },
  audio: { icon: Mic, label: "Audio" },
};

const CAP_META: Record<string, { icon: typeof Brain; label: string }> = {
  reasoning: { icon: Brain, label: "Penalaran" },
  tool_call: { icon: Wrench, label: "Tool Calling" },
  structured_output: { icon: Braces, label: "Output Terstruktur" },
  attachment: { icon: Paperclip, label: "Lampiran" },
};

/** Filter kemampuan yang bisa dipilih, urutan tampil tetap. */
const CAP_FILTERS = [
  { key: "image", label: "Vision", kind: "mod" },
  { key: "video", label: "Video", kind: "mod" },
  { key: "pdf", label: "PDF", kind: "mod" },
  { key: "reasoning", label: "Penalaran", kind: "cap" },
  { key: "tool_call", label: "Tool Calling", kind: "cap" },
  { key: "structured_output", label: "Output Terstruktur", kind: "cap" },
  { key: "attachment", label: "Lampiran", kind: "cap" },
] as const;

function Chip({ icon: Icon, children }: { icon: typeof Type; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-300">
      <Icon size={12} className="text-lime-300/90" />
      {children}
    </span>
  );
}

const chipBtn = (on: boolean) =>
  `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
    on
      ? "bg-lime-400 font-semibold text-zinc-950 shadow-[0_6px_20px_-6px_rgba(163,230,53,0.6)]"
      : "border border-white/10 text-zinc-300 hover:border-lime-300/40 hover:text-lime-200"
  }`;

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <dt className="truncate text-[11px] text-zinc-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-zinc-100">{value ?? "-"}</dd>
    </div>
  );
}

export default function CatalogExplorer({
  models,
  viewerPlan,
}: {
  models: CatalogModel[];
  viewerPlan: string;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("semua");
  const [caps, setCaps] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  const families = useMemo(() => {
    const seen: { key: string; label: string }[] = [];
    for (const m of models) {
      const f = modelFamily(m.modelId);
      if (!seen.some((s) => s.key === f)) seen.push({ key: f, label: familyLabel(m.modelId) });
    }
    return seen;
  }, [models]);

  const familyCount = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of models) c.set(modelFamily(m.modelId), (c.get(modelFamily(m.modelId)) ?? 0) + 1);
    return c;
  }, [models]);

  const availableCapFilters = useMemo(
    () =>
      CAP_FILTERS.filter((f) =>
        models.some((m) => (f.kind === "mod" ? m.modalities : m.capabilities).includes(f.key)),
      ),
    [models],
  );

  const filtered = models.filter((m) => {
    if (family !== "semua" && modelFamily(m.modelId) !== family) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!m.displayName.toLowerCase().includes(q) && !m.modelId.toLowerCase().includes(q))
        return false;
    }
    for (const c of caps) {
      const f = CAP_FILTERS.find((x) => x.key === c);
      if (!f) continue;
      const pool = f.kind === "mod" ? m.modalities : m.capabilities;
      if (!pool.includes(c)) return false;
    }
    return true;
  });

  const hasFilter = family !== "semua" || caps.size > 0 || query !== "";

  function toggleCap(key: string) {
    setCaps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function reset() {
    setFamily("semua");
    setCaps(new Set());
    setQuery("");
  }

  const rowCls = "flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden";
  const labelCls = "mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500 sm:mb-0 sm:w-24 sm:shrink-0";

  return (
    <div>
      <div className="z-20 rounded-3xl border border-white/[0.08] bg-[#080b07]/90 p-4 backdrop-blur-xl sm:p-5 lg:sticky lg:top-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari model, misalnya deepseek atau glm"
            aria-label="Cari model"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="mt-4 sm:flex sm:items-center">
          <span className={labelCls}>Merek</span>
          <div className={rowCls}>
            <button type="button" aria-pressed={family === "semua"} onClick={() => setFamily("semua")} className={chipBtn(family === "semua")}>
              Semua
            </button>
            {families.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={family === f.key}
                onClick={() => setFamily(f.key)}
                className={chipBtn(family === f.key)}
              >
                {f.label}
                <span className={`text-[10px] ${family === f.key ? "text-zinc-950/60" : "text-zinc-500"}`}>
                  {familyCount.get(f.key)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {availableCapFilters.length > 0 && (
          <div className="mt-3 sm:flex sm:items-center">
            <span className={labelCls}>Kemampuan</span>
            <div className={rowCls}>
              {availableCapFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={caps.has(f.key)}
                  onClick={() => toggleCap(f.key)}
                  className={chipBtn(caps.has(f.key))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <p className="text-sm text-zinc-400" aria-live="polite">
            Menampilkan{" "}
            <span className="font-semibold text-zinc-100">{filtered.length}</span> dari{" "}
            {models.length} model
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-lime-300 transition hover:text-lime-200"
            >
              <RotateCcw size={14} /> Atur Ulang
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-3xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-400">
            <Search size={20} />
          </span>
          <p className="mt-4 text-sm text-zinc-400">Tidak ada model yang cocok dengan filter ini.</p>
          <button type="button" onClick={reset} className="mt-3 text-sm font-medium text-lime-300 transition hover:text-lime-200">
            Atur Ulang
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m, i) => {
            const ctx = fmtTokens(m.contextTokens);
            const out = fmtTokens(m.maxOutputTokens);
            const cutoff = fmtCutoff(m.knowledgeCutoff);
            const locked = m.earlyAccess && viewerPlan === "gratis";
            return (
              <div key={m.id} className="card-in min-w-0" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                <Spot className="h-full rounded-3xl">
                  <article className="flex h-full min-w-0 flex-col p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <ProviderIcon modelId={m.modelId} className="h-11 w-11 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                          {familyLabel(m.modelId)}
                        </p>
                        <h2 className="mt-0.5 truncate font-semibold leading-snug">{m.displayName}</h2>
                      </div>
                      {m.earlyAccess && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          <Sparkles size={11} /> Akses Awal
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/30 py-1.5 pl-3 pr-1.5">
                      <code className="min-w-0 flex-1 truncate font-mono text-xs text-lime-300/90" title={m.modelId}>
                        {m.modelId}
                      </code>
                      <CopyModelId modelId={m.modelId} />
                    </div>

                    <dl className="mt-3 grid grid-cols-3 gap-2">
                      <Spec label="Konteks" value={ctx} />
                      <Spec label="Output maks" value={out} />
                      <Spec label="Data s/d" value={cutoff} />
                    </dl>

                    {(m.modalities.some((x) => MOD_META[x]) || m.capabilities.some((x) => CAP_META[x])) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.modalities.map((mod) =>
                          MOD_META[mod] ? (
                            <Chip key={mod} icon={MOD_META[mod].icon}>
                              {MOD_META[mod].label}
                            </Chip>
                          ) : null,
                        )}
                        {m.capabilities.map((cap) =>
                          CAP_META[cap] ? (
                            <Chip key={cap} icon={CAP_META[cap].icon}>
                              {CAP_META[cap].label}
                            </Chip>
                          ) : null,
                        )}
                      </div>
                    )}

                    <div className="mt-auto" /><p className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-500">
                      {locked ? (
                        <>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                          Akses awal, hanya untuk plan Pro dan Max
                        </>
                      ) : (
                        <>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.active ? "bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.8)]" : "bg-zinc-600"}`} />
                          {m.active ? "Aktif, siap dipakai dengan key kamu" : "Sedang nonaktif"}
                        </>
                      )}
                    </p>
                  </article>
                </Spot>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
