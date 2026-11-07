"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Plus, Power, Search, SlidersHorizontal, Target, Trash2, X } from "lucide-react";
import ProviderIcon from "@/app/ProviderIcon";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";
import { PageHeader, PANEL, Pill } from "@/app/app/ui";

type ModelRow = {
  id: string;
  modelId: string;
  displayName: string;
  contextTokens: number | null;
  maxOutputTokens: number | null;
  inputModalities: string | null;
  capabilities: string | null;
  knowledgeCutoff: string | null;
  earlyAccessUntil: string | null;
  isActive: boolean;
  routeId: string | null;
  target: string | null;
};

const MODALITY_OPTS = [
  { value: "text", label: "Teks" },
  { value: "image", label: "Vision" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "Audio" },
];
const CAPABILITY_OPTS = [
  { value: "reasoning", label: "Penalaran" },
  { value: "tool_call", label: "Tool Calling" },
  { value: "structured_output", label: "Output Terstruktur" },
  { value: "attachment", label: "Lampiran" },
];

function fmtTok(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function csvToList(value: string | null): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

// Label tampil untuk sasaran 9Router: buang segmen awalan providernya,
// yang terlihat cukup nama modelnya saja.
function stripPrefix(id: string): string {
  const at = id.indexOf("/");
  return at > 0 ? id.slice(at + 1) : id;
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";
const btnCls =
  "btn-shine inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

// Konversi ISO ke nilai input datetime-local (waktu setempat).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function MetaForm({ model, onDone }: { model: ModelRow; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(model.displayName);
  const [ctx, setCtx] = useState(model.contextTokens?.toString() ?? "");
  const [maxOut, setMaxOut] = useState(model.maxOutputTokens?.toString() ?? "");
  const [cutoff, setCutoff] = useState(model.knowledgeCutoff ?? "");
  const [early, setEarly] = useState(isoToLocalInput(model.earlyAccessUntil));
  const [mods, setMods] = useState<string[]>(csvToList(model.inputModalities));
  const [caps, setCaps] = useState<string[]>(csvToList(model.capabilities));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const checkCls = (on: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      on
        ? "border-lime-300/50 bg-lime-400/10 text-lime-200"
        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
    }`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          contextTokens: ctx === "" ? null : Number(ctx),
          maxOutputTokens: maxOut === "" ? null : Number(maxOut),
          inputModalities: mods,
          capabilities: caps,
          knowledgeCutoff: cutoff === "" ? null : cutoff,
          earlyAccessUntil: early === "" ? null : new Date(early).toISOString(),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `Gagal (${res.status})`);
      }
      onDone();
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan metadata");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-5 rounded-2xl border border-white/[0.08] bg-black/30 p-4 sm:p-5">
      <p className="text-sm font-semibold">Metadata Katalog</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Data ini yang tampil di kartu katalog user. Kosongkan angka untuk menyembunyikannya.
      </p>
      {err && <p role="alert" className="mt-2 text-sm text-red-300">{err}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Nama tampilan</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Konteks (token)</span>
          <input className={inputCls} type="number" min="0" placeholder="1000000" value={ctx} onChange={(e) => setCtx(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Output maks (token)</span>
          <input className={inputCls} type="number" min="0" placeholder="128000" value={maxOut} onChange={(e) => setMaxOut(e.target.value)} />
        </label>
      </div>
      <div className="mt-3">
        <span className="mb-1.5 block text-xs text-zinc-400">Modalitas input</span>
        <div className="flex flex-wrap gap-1.5">
          {MODALITY_OPTS.map((o) => (
            <button type="button" key={o.value} onClick={() => toggle(mods, setMods, o.value)} className={checkCls(mods.includes(o.value))}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <span className="mb-1.5 block text-xs text-zinc-400">Kapabilitas</span>
        <div className="flex flex-wrap gap-1.5">
          {CAPABILITY_OPTS.map((o) => (
            <button type="button" key={o.value} onClick={() => toggle(caps, setCaps, o.value)} className={checkCls(caps.includes(o.value))}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Batas pengetahuan (YYYY-MM)</span>
          <input className={`${inputCls} w-44`} placeholder="2025-05" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">Akses awal sampai (khusus plan berbayar)</span>
          <input className={`${inputCls} w-60`} type="datetime-local" value={early} onChange={(e) => setEarly(e.target.value)} />
        </label>
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Menyimpan..." : "Simpan Metadata"}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Akses awal: selama tanggal itu belum lewat, model hanya bisa dipakai plan Pro dan Max.
        Kosongkan untuk membuka ke semua plan.
      </p>
    </form>
  );
}

export default function ModelsManager({
  models,
  routerProviderId,
  routerModels,
  routerOk,
}: {
  models: ModelRow[];
  routerProviderId: string | null;
  routerModels: string[];
  routerOk: boolean;
}) {
  const router = useRouter();
  const [modelId, setModelId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [err, setErr] = useState("");
  const [openMeta, setOpenMeta] = useState<string | null>(null);
  const [confirmModel, setConfirmModel] = useState<ModelRow | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [targetEdits, setTargetEdits] = useState<Record<string, string>>({});
  const [targetBusy, setTargetBusy] = useState<string | null>(null);
  const [activeBusy, setActiveBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(d.error ?? `Gagal (${res.status})`);
    }
    return res;
  }

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    if (!routerProviderId || !newTarget) return;
    setErr("");
    try {
      const res = await call("/api/admin/models", "POST", { modelId, displayName });
      const created = (await res.json()) as { model: { id: string } };
      await call(`/api/admin/models/${created.model.id}/routes`, "POST", {
        providerId: routerProviderId,
        upstreamModelId: newTarget,
        priority: 1,
      });
      setModelId("");
      setDisplayName("");
      setNewTarget("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menambah model");
    }
  }

  async function saveTarget(m: ModelRow) {
    const chosen = targetEdits[m.id] ?? m.target ?? "";
    if (!chosen || !routerProviderId) return;
    setTargetBusy(m.id);
    setErr("");
    try {
      if (m.routeId) {
        await call(`/api/admin/routes/${m.routeId}`, "PATCH", { upstreamModelId: chosen });
      } else {
        await call(`/api/admin/models/${m.id}/routes`, "POST", {
          providerId: routerProviderId,
          upstreamModelId: chosen,
          priority: 1,
        });
      }
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan sasaran");
    } finally {
      setTargetBusy(null);
    }
  }

  async function toggleActive(m: ModelRow) {
    setActiveBusy(m.id);
    setErr("");
    try {
      await call(`/api/admin/models/${m.id}`, "PATCH", { isActive: !m.isActive });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal mengubah status model");
    } finally {
      setActiveBusy(null);
    }
  }

  async function doConfirmDelete() {
    if (!confirmModel) return;
    setConfirmBusy(true);
    setErr("");
    try {
      await call(`/api/admin/models/${confirmModel.id}`, "DELETE");
      setConfirmModel(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus");
      setConfirmModel(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = models.filter(
    (x) => !q || x.modelId.toLowerCase().includes(q) || x.displayName.toLowerCase().includes(q),
  );
  const unlinked = models.filter((x) => !x.target).length;

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Panel Admin" title="Model">
        <p>
          Katalog model yang dilihat klien. Setiap model terhubung ke satu model di 9Router
          sebagai sasarannya; urusan provider, key, dan fallback dikelola di dashboard 9Router.
        </p>
      </PageHeader>

      <div aria-live="polite">
        {err && (
          <p role="alert" className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {err}
            <button onClick={() => setErr("")} aria-label="Tutup pesan" className="shrink-0 text-red-300/70 hover:text-red-200">
              <X size={15} />
            </button>
          </p>
        )}
        {!routerOk && (
          <p className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-200">
            Daftar model 9Router tidak terjangkau saat ini, jadi sasaran model belum bisa dipilih
            atau diganti. Periksa layanan 9Router, lalu muat ulang halaman ini.
          </p>
        )}
      </div>

      <Reveal>
        <form onSubmit={addModel} className={`${PANEL} mt-6 p-5 sm:p-6`}>
          <p className="flex items-center gap-3 text-sm font-semibold sm:text-base">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Network size={18} />
            </span>
            Model Baru
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">ID model</span>
              <input className={inputCls} placeholder="ID model (mis. deepseek-v4-flash-0731)" value={modelId} onChange={(e) => setModelId(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Nama tampilan</span>
              <input className={inputCls} placeholder="Nama tampilan (opsional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs text-zinc-500">Sasaran di 9Router</span>
              <select className={inputCls} value={newTarget} onChange={(e) => setNewTarget(e.target.value)} required disabled={!routerOk}>
                <option value="" disabled>
                  {routerOk ? "Pilih sasaran di 9Router" : "9Router tidak terjangkau"}
                </option>
                {routerModels.map((id) => (
                  <option key={id} value={id}>
                    {stripPrefix(id)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={btnCls + " px-5"} disabled={!routerOk || !newTarget}>
              <Plus size={16} /> Tambah Model
            </button>
          </div>
        </form>
      </Reveal>

      {/* Cari model */}
      {models.length > 0 && (
        <div className={`${PANEL} mt-4 p-4 sm:p-5`}>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ID atau nama model"
              aria-label="Cari model"
              className={`${inputCls} pl-10 pr-10`}
            />
            {query && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <p className="mt-3 text-sm text-zinc-400" aria-live="polite">
            Menampilkan <span className="font-semibold text-zinc-100">{shown.length}</span> dari {models.length} model
            {unlinked > 0 && <span className="text-amber-300/90"> · {unlinked} belum punya sasaran</span>}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4">
        {models.length === 0 && (
          <p className={`${PANEL} px-4 py-10 text-center text-sm text-zinc-500`}>Belum ada model.</p>
        )}
        {models.length > 0 && shown.length === 0 && (
          <p className={`${PANEL} px-4 py-10 text-center text-sm text-zinc-500`}>Tidak ada model yang cocok.</p>
        )}
        {shown.map((m, mi) => {
          const chosen = targetEdits[m.id] ?? m.target ?? "";
          const changed = chosen !== (m.target ?? "");
          const ctx = fmtTok(m.contextTokens);
          const out = fmtTok(m.maxOutputTokens);
          return (
            <Reveal key={m.id} delay={Math.min(mi, 6) * 60}>
              <div className={`${PANEL} p-4 transition sm:p-6 ${openMeta === m.id ? "border-lime-300/30" : ""}`}>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <ProviderIcon modelId={m.modelId} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1 basis-52">
                    <code className="block break-all font-mono text-sm font-semibold text-lime-300">{m.modelId}</code>
                    <span className="mt-0.5 block text-sm text-zinc-400">{m.displayName}</span>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                    <Pill className={`px-2.5 py-1 font-medium ${m.target ? "bg-lime-400/10 text-lime-300" : "bg-amber-400/10 text-amber-300"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${m.target ? "bg-lime-300" : "bg-amber-300"}`} />
                      {m.target ? "Terhubung" : "Belum terhubung"}
                    </Pill>
                    {!m.isActive && (
                      <Pill className="bg-zinc-400/10 px-2.5 py-1 font-medium text-zinc-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                        Nonaktif
                      </Pill>
                    )}
                    <span className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => toggleActive(m)}
                        disabled={activeBusy === m.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-medium text-zinc-300 outline-none transition hover:border-lime-300/40 hover:text-lime-200 focus-visible:ring-2 focus-visible:ring-lime-300/60 disabled:opacity-50"
                        title={m.isActive ? "Sembunyikan model dari katalog user tanpa menghapusnya" : "Tampilkan lagi model di katalog user"}
                      >
                        <Power size={13} /> {m.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => setOpenMeta(openMeta === m.id ? null : m.id)}
                        aria-expanded={openMeta === m.id}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
                          openMeta === m.id
                            ? "border-lime-300/40 bg-lime-400/10 text-lime-200"
                            : "border-white/10 text-zinc-300 hover:border-lime-300/40 hover:text-lime-200"
                        }`}
                      >
                        <SlidersHorizontal size={13} /> Metadata
                      </button>
                      <button
                        onClick={() => setConfirmModel(m)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 outline-none transition hover:border-red-400/40 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-lime-300/60"
                        title="Hapus model"
                        aria-label={`Hapus model ${m.modelId}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                </div>

                {(ctx || out || m.knowledgeCutoff) && (
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    {[
                      ["Konteks", ctx],
                      ["Output maks", out],
                      ["Data s/d", m.knowledgeCutoff],
                    ].map(([k, v]) => (
                      <div key={k} className="min-w-0 rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="truncate text-[11px] text-zinc-500">{k}</dt>
                        <dd className="mt-0.5 truncate font-semibold tabular-nums text-zinc-100">{v ?? "-"}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {openMeta === m.id && <MetaForm model={m} onDone={() => setOpenMeta(null)} />}

                <div className="mt-5 border-t border-white/[0.07] pt-5">
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    <Target size={13} /> Sasaran di 9Router
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      className={inputCls}
                      value={chosen}
                      disabled={!routerOk}
                      aria-label={`Sasaran 9Router untuk ${m.modelId}`}
                      onChange={(e) => setTargetEdits((s) => ({ ...s, [m.id]: e.target.value }))}
                    >
                      {!m.target && (
                        <option value="" disabled>
                          Belum terhubung, pilih sasaran
                        </option>
                      )}
                      {routerModels.map((id) => (
                        <option key={id} value={id}>
                          {stripPrefix(id)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => saveTarget(m)}
                      className={btnCls + " px-5"}
                      disabled={!routerOk || !changed || targetBusy === m.id}
                    >
                      {targetBusy === m.id ? "Menyimpan..." : "Simpan Sasaran"}
                    </button>
                  </div>
                  {m.target ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Terhubung ke <span className="font-mono text-zinc-300">{stripPrefix(m.target)}</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300/90">
                      Model ini belum punya sasaran, klien belum bisa memakainya.
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {confirmModel && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus model ini?"
          description={
            <>
              Model <span className="font-medium text-zinc-200">{confirmModel.modelId}</span> akan dihapus
              dari katalog beserta sasarannya. Klien tidak bisa lagi memakai model ini.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={confirmBusy}
          onCancel={() => setConfirmModel(null)}
          onConfirm={doConfirmDelete}
        />
      )}
    </div>
  );
}
