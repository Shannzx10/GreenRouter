"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  Braces,
  CalendarDays,
  Expand,
  Eye,
  FileText,
  Mic,
  Paperclip,
  PenLine,
  RotateCcw,
  Search,
  Type,
  Video,
  Wrench,
} from "lucide-react";
import ProviderIcon, { familyLabel, modelFamily } from "../../ProviderIcon";
import CopyModelId from "./CopyModelId";

export type CatalogModel = {
  id: string;
  modelId: string;
  displayName: string;
  active: boolean;
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
  `rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
    on
      ? "bg-lime-400 font-semibold text-zinc-950"
      : "border border-white/10 text-zinc-300 hover:bg-white/[0.04]"
  }`;

export default function CatalogExplorer({ models }: { models: CatalogModel[] }) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("semua");
  const [caps, setCaps] = useState<Set<string>>(new Set());

  const families = useMemo(() => {
    const seen: { key: string; label: string }[] = [];
    for (const m of models) {
      const f = modelFamily(m.modelId);
      if (!seen.some((s) => s.key === f)) seen.push({ key: f, label: familyLabel(m.modelId) });
    }
    return seen;
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

  return (
    <div>
      <div className="glass rounded-3xl p-4 sm:p-5">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari model, misalnya deepseek atau glm"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Merek
          </span>
          <button type="button" onClick={() => setFamily("semua")} className={chipBtn(family === "semua")}>
            Semua
          </button>
          {families.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFamily(f.key)}
              className={chipBtn(family === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {availableCapFilters.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Kemampuan
            </span>
            {availableCapFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleCap(f.key)}
                className={chipBtn(caps.has(f.key))}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
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
        <div className="glass mt-5 rounded-3xl px-6 py-12 text-center text-sm text-zinc-500">
          Tidak ada model yang cocok dengan filter ini.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filtered.map((m) => {
            const ctx = fmtTokens(m.contextTokens);
            const out = fmtTokens(m.maxOutputTokens);
            const cutoff = fmtCutoff(m.knowledgeCutoff);
            return (
              <article
                key={m.id}
                className="glass group min-w-0 rounded-3xl p-4 transition duration-300 hover:-translate-y-0.5 hover:border-lime-300/25 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <ProviderIcon modelId={m.modelId} className="h-10 w-10 sm:h-11 sm:w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                      {familyLabel(m.modelId)}
                    </p>
                    <h2 className="mt-0.5 truncate font-semibold leading-snug">{m.displayName}</h2>
                    <code className="block break-all font-mono text-xs leading-relaxed text-lime-300/90">
                      {m.modelId}
                    </code>
                  </div>
                  <CopyModelId modelId={m.modelId} />
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ctx && <Chip icon={Expand}>Konteks {ctx}</Chip>}
                  {out && <Chip icon={PenLine}>Output maks {out}</Chip>}
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
                  {cutoff && <Chip icon={CalendarDays}>Data s/d {cutoff}</Chip>}
                </div>

                <p className="mt-4 flex items-center gap-2 border-t border-white/[0.05] pt-3 text-xs text-zinc-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${m.active ? "bg-lime-300" : "bg-zinc-600"}`} />
                  {m.active ? "Aktif, siap dipakai dengan key kamu" : "Sedang nonaktif"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
