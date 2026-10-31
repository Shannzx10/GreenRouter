"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Plus, SlidersHorizontal, Target, Trash2 } from "lucide-react";
import ProviderIcon from "@/app/ProviderIcon";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";

type ModelRow = {
  id: string;
  modelId: string;
  displayName: string;
  contextTokens: number | null;
  maxOutputTokens: number | null;
  inputModalities: string | null;
  capabilities: string | null;
  knowledgeCutoff: string | null;
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
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";
const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

function MetaForm({ model, onDone }: { model: ModelRow; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(model.displayName);
  const [ctx, setCtx] = useState(model.contextTokens?.toString() ?? "");
  const [maxOut, setMaxOut] = useState(model.maxOutputTokens?.toString() ?? "");
  const [cutoff, setCutoff] = useState(model.knowledgeCutoff ?? "");
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
    <form onSubmit={save} className="mt-5 rounded-3xl border border-white/[0.06] bg-black/20 p-5">
      <p className="text-sm font-semibold">Metadata Katalog</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Data ini yang tampil di kartu katalog user. Kosongkan angka untuk menyembunyikannya.
      </p>
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
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
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "Menyimpan..." : "Simpan Metadata"}
        </button>
      </div>
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

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
          Panel Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Model</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Katalog model yang dilihat klien. Setiap model terhubung ke satu model di 9Router
          sebagai sasarannya; urusan provider, key, dan fallback dikelola di dashboard 9Router.
        </p>
      </Reveal>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {err}
        </p>
      )}
      {!routerOk && (
        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-200">
          Daftar model 9Router tidak terjangkau saat ini, jadi sasaran model belum bisa dipilih
          atau diganti. Periksa layanan 9Router, lalu muat ulang halaman ini.
        </p>
      )}

      <Reveal>
        <form onSubmit={addModel} className="glass mt-6 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Network size={19} />
            </span>
            <p className="font-semibold sm:text-lg">Model Baru</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="ID model (mis. deepseek-v4-flash-0731)" value={modelId} onChange={(e) => setModelId(e.target.value)} required />
            <input className={inputCls} placeholder="Nama tampilan (opsional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
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
            <button type="submit" className={btnCls} disabled={!routerOk || !newTarget}>
              <Plus size={16} /> Tambah Model
            </button>
          </div>
        </form>
      </Reveal>

      <div className="mt-6 flex flex-col gap-4">
        {models.length === 0 && (
          <p className="glass rounded-3xl px-4 py-8 text-center text-zinc-500">Belum ada model.</p>
        )}
        {models.map((m, mi) => {
          const chosen = targetEdits[m.id] ?? m.target ?? "";
          const changed = chosen !== (m.target ?? "");
          return (
            <Reveal key={m.id} delay={mi * 80}>
              <div className="glass rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <ProviderIcon modelId={m.modelId} className="h-11 w-11" />
                  <div className="min-w-0">
                    <code className="block break-all font-mono text-sm font-semibold text-lime-300">{m.modelId}</code>
                    <span className="mt-0.5 block text-sm text-zinc-400">{m.displayName}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={() => setOpenMeta(openMeta === m.id ? null : m.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        openMeta === m.id
                          ? "bg-lime-400/10 text-lime-200"
                          : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.07]"
                      }`}
                    >
                      <SlidersHorizontal size={13} /> Metadata
                    </button>
                    <button
                      onClick={() => setConfirmModel(m)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                      title="Hapus model"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {openMeta === m.id && <MetaForm model={m} onDone={() => setOpenMeta(null)} />}

                <div className="mt-6 border-t border-white/[0.05] pt-5">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    <Target size={13} /> Sasaran di 9Router
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      className={inputCls}
                      value={chosen}
                      disabled={!routerOk}
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
                      className={btnCls}
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
