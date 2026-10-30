"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  KeyRound,
  Play,
  Plus,
  Power,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";
import type { ProviderGuide } from "@/server/provider-guides";

type Prov = {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  supportsAnthropic: boolean;
  quotaCheckUrl: string | null;
  quotaKind: string;
  quotaAmount: string;
  quotaReset: string;
  rateLimitNote: string;
  notes: string;
};
type UpKey = {
  id: string;
  label: string;
  keyHint: string;
  status: string;
  cooldownUntil: string | null;
  failCount: number;
  createdAt: string;
};
type RouteRow = { id: string; modelId: string; displayName: string; upstreamModelId: string };
type ErrRow = { modelId: string; error: string; at: string };
type HealthRow = { modelId: string; status: string; latencyMs: number; error: string | null; checkedAt: string };
type DiagKey = {
  keyId: string; label: string; status: string; ok: boolean; httpStatus: number;
  latencyMs: number; modelIds: string[]; error?: string;
};
type DiagRoute = {
  modelId: string; displayName: string; upstreamModelId: string; keyLabel: string | null;
  ok: boolean; httpStatus: number; latencyMs: number; error?: string;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";
const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}
function fmtLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} dtk` : `${ms} ms`;
}
function statusBadge(k: UpKey) {
  if (k.status === "ACTIVE")
    return <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-xs text-lime-300">AKTIF</span>;
  if (k.status === "LIMITED")
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
        LIMIT TOKEN (402)
      </span>
    );
  if (k.status === "COOLDOWN")
    return <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">COOLDOWN</span>;
  return <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-400">NONAKTIF</span>;
}
function okPill(ok: boolean) {
  return ok ? (
    <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-xs text-lime-300">Berhasil</span>
  ) : (
    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">Gagal</span>
  );
}

export default function ProviderDiagnosis({
  provider,
  keys,
  routes,
  lastErrors,
  lastErrorByKey,
  health,
  guide,
}: {
  provider: Prov;
  keys: UpKey[];
  routes: RouteRow[];
  lastErrors: ErrRow[];
  lastErrorByKey: Record<string, { error: string; at: string }>;
  health: HealthRow[];
  guide: ProviderGuide | null;
}) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState({
    quotaKind: provider.quotaKind,
    quotaAmount: provider.quotaAmount,
    quotaReset: provider.quotaReset,
    rateLimitNote: provider.rateLimitNote,
    notes: provider.notes,
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [keyForm, setKeyForm] = useState({ label: "", key: "" });
  const [confirmKey, setConfirmKey] = useState<UpKey | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diag, setDiag] = useState<{ ranAt: string; keys: DiagKey[]; routes: DiagRoute[] } | null>(null);

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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setErr("");
    try {
      await call(`/api/admin/providers/${provider.id}`, "PATCH", profile);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan profil");
    } finally {
      setSavingProfile(false);
    }
  }

  async function addKey() {
    if (!keyForm.key.trim()) return;
    setErr("");
    try {
      await call(`/api/admin/providers/${provider.id}/keys`, "POST", keyForm);
      setKeyForm({ label: "", key: "" });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menambah key");
    }
  }

  async function setKeyStatus(k: UpKey, status: "ACTIVE" | "DISABLED") {
    setErr("");
    try {
      await call(`/api/admin/upstream-keys/${k.id}`, "PATCH", { status });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal mengubah status key");
    }
  }

  async function doConfirmDeleteKey() {
    if (!confirmKey) return;
    setConfirmBusy(true);
    setErr("");
    try {
      await call(`/api/admin/upstream-keys/${confirmKey.id}`, "DELETE");
      setConfirmKey(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus key");
      setConfirmKey(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  async function runDiagnosis() {
    setDiagRunning(true);
    setErr("");
    try {
      const res = await call(`/api/admin/providers/${provider.id}/diagnose`, "POST");
      setDiag(await res.json());
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Diagnosis gagal dijalankan");
    } finally {
      setDiagRunning(false);
    }
  }

  const now = Date.now();

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <Link href="/admin/providers" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-lime-200">
          <ArrowLeft size={15} /> Kembali ke daftar Provider
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{provider.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${provider.isActive ? "bg-lime-400/10 text-lime-300" : "bg-zinc-500/15 text-zinc-400"}`}>
            {provider.isActive ? "AKTIF" : "NONAKTIF"}
          </span>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-400">
            {provider.supportsAnthropic ? "Anthropic natif" : "Anthropic via penerjemah"}
          </span>
          {provider.quotaCheckUrl && (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-400">
              Cek sisa kuota per request
            </span>
          )}
        </div>
        <code className="mt-2 block break-all font-mono text-sm text-zinc-400">{provider.baseUrl}</code>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
          Halaman diagnosis provider ini: key hulu, profil kapasitas, panduan mekanisme,
          dan tes langsung ke layanannya.
        </p>
      </Reveal>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {err}
        </p>
      )}

      {/* ===== Key Hulu ===== */}
      <Reveal>
        <div className="glass mt-8 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <KeyRound size={19} />
            </span>
            <p className="font-semibold sm:text-lg">Key Hulu ({keys.length})</p>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            {keys.length === 0 && <p className="text-sm text-zinc-500">Belum ada key untuk provider ini.</p>}
            {keys.map((k) => {
              const lastErr = lastErrorByKey[k.id];
              const waiting = k.status === "ACTIVE" && k.cooldownUntil && new Date(k.cooldownUntil).getTime() > now;
              return (
                <div key={k.id} className="rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">{k.label}</span>
                    <code className="font-mono text-xs text-zinc-400">{k.keyHint}</code>
                    {statusBadge(k)}
                    {waiting && (
                      <span className="text-xs text-amber-300">
                        masa tunggu rate limit s.d. {new Date(k.cooldownUntil!).toLocaleTimeString("id-ID")}
                      </span>
                    )}
                    {k.failCount > 0 && <span className="text-xs text-zinc-500">gagal: {k.failCount}×</span>}
                    <div className="ml-auto flex items-center gap-1">
                      {k.status !== "ACTIVE" && (
                        <button
                          onClick={() => setKeyStatus(k, "ACTIVE")}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-lime-300 transition hover:bg-white/[0.06]"
                        >
                          <RotateCcw size={13} /> Aktifkan
                        </button>
                      )}
                      {k.status === "ACTIVE" && (
                        <button
                          onClick={() => setKeyStatus(k, "DISABLED")}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/[0.06]"
                        >
                          <Power size={13} /> Nonaktifkan
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmKey(k)}
                        className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                        title="Hapus key"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  {lastErr && (
                    <p className="mt-1.5 text-xs leading-relaxed text-red-300/80">
                      Error terakhir ({fmtTime(lastErr.at)}): {lastErr.error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-2 border-t border-white/[0.05] pt-5 sm:grid-cols-[1fr_1.5fr_auto]">
            <input className={inputCls} placeholder="Label key (opsional)" value={keyForm.label} onChange={(e) => setKeyForm((s) => ({ ...s, label: e.target.value }))} />
            <input className={inputCls} type="password" placeholder="API key baru untuk provider ini" value={keyForm.key} onChange={(e) => setKeyForm((s) => ({ ...s, key: e.target.value }))} />
            <button onClick={addKey} className={btnCls} disabled={!keyForm.key.trim()}>
              <Plus size={16} /> Tambah Key
            </button>
          </div>
        </div>
      </Reveal>

      {/* ===== Diagnosis langsung ===== */}
      <Reveal>
        <div className="glass mt-6 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Activity size={19} />
            </span>
            <div>
              <p className="font-semibold sm:text-lg">Diagnosis Langsung</p>
              <p className="text-sm text-zinc-400">
                Mengambil daftar model asli tiap key (isi pool-nya) dan mengirim satu chat kecil ke tiap route.
              </p>
            </div>
            <button onClick={runDiagnosis} className={`${btnCls} ml-auto`} disabled={diagRunning}>
              <Play size={15} /> {diagRunning ? "Menjalankan..." : "Tes Sekarang"}
            </button>
          </div>

          {diag && (
            <div className="mt-6 space-y-6">
              <p className="text-xs text-zinc-500">Dijalankan {fmtTime(diag.ranAt)}</p>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Key & Isi Pool</p>
                <div className="mt-3 flex flex-col gap-2">
                  {diag.keys.map((k) => (
                    <div key={k.keyId} className="rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium">{k.label}</span>
                        {okPill(k.ok)}
                        <span className="text-xs text-zinc-500">HTTP {k.httpStatus || "—"} · {fmtLatency(k.latencyMs)}</span>
                        <span className="text-xs text-zinc-400">{k.modelIds.length} model di pool</span>
                      </div>
                      {k.modelIds.length > 0 && (
                        <p className="mt-1.5 break-words font-mono text-[11px] leading-relaxed text-zinc-500">
                          {k.modelIds.join(", ")}
                        </p>
                      )}
                      {k.error && <p className="mt-1.5 text-xs text-red-300/80">{k.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Chat per Route</p>
                <div className="mt-3 flex flex-col gap-2">
                  {diag.routes.map((r) => (
                    <div key={r.modelId} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-2.5">
                      <span className="text-sm font-medium">{r.displayName}</span>
                      <code className="font-mono text-xs text-zinc-500">{r.upstreamModelId}</code>
                      {okPill(r.ok)}
                      <span className="text-xs text-zinc-500">HTTP {r.httpStatus || "—"} · {fmtLatency(r.latencyMs)}</span>
                      {r.keyLabel && <span className="text-xs text-zinc-400">via {r.keyLabel}</span>}
                      {r.error && <span className="w-full text-xs text-red-300/80">{r.error}</span>}
                    </div>
                  ))}
                  {diag.routes.length === 0 && <p className="text-sm text-zinc-500">Provider ini belum punya route model.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* ===== Profil kapasitas ===== */}
      <Reveal>
        <form onSubmit={saveProfile} className="glass mt-6 rounded-3xl p-5 sm:p-6">
          <p className="font-semibold sm:text-lg">Profil Kapasitas</p>
          <p className="mt-1 text-sm text-zinc-400">
            Ringkasan jatah dan batas provider ini, diisi manual dari ketentuan resminya.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Jenis jatah</span>
              <input className={inputCls} placeholder="mis. Allowance gratis / Stok token / Jatah USD" value={profile.quotaKind} onChange={(e) => setProfile((s) => ({ ...s, quotaKind: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Besaran</span>
              <input className={inputCls} placeholder="mis. 2.000.000 token" value={profile.quotaAmount} onChange={(e) => setProfile((s) => ({ ...s, quotaAmount: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Pola reset</span>
              <input className={inputCls} placeholder="mis. Harian / Sekali pakai, tidak reset" value={profile.quotaReset} onChange={(e) => setProfile((s) => ({ ...s, quotaReset: e.target.value }))} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-zinc-400">Rate limit</span>
              <input className={inputCls} placeholder="mis. 50 req/menit, 2 jt token/menit" value={profile.rateLimitNote} onChange={(e) => setProfile((s) => ({ ...s, rateLimitNote: e.target.value }))} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">Catatan</span>
            <textarea className={`${inputCls} min-h-24`} placeholder="Catatan operasional bebas untuk provider ini" value={profile.notes} onChange={(e) => setProfile((s) => ({ ...s, notes: e.target.value }))} />
          </label>
          <button type="submit" className={`${btnCls} mt-4`} disabled={savingProfile}>
            <Save size={15} /> {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>
      </Reveal>

      {/* ===== Panduan mekanisme & peta error ===== */}
      {guide && (
        <Reveal>
          <div className="glass mt-6 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                <BookOpen size={19} />
              </span>
              <p className="font-semibold sm:text-lg">Panduan Mekanisme {provider.name}</p>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
              {guide.mechanism.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Peta Error</p>
            <div className="mt-3 flex flex-col gap-2">
              {guide.errors.map((e) => (
                <div key={e.code + e.name} className="rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="rounded-md bg-white/[0.07] px-2 py-0.5 font-mono text-xs font-semibold text-zinc-100">{e.code}</span>
                    <code className="font-mono text-xs text-lime-200/90">{e.name}</code>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-300">{e.meaning}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">Perlakuan GreenRouter: {e.handling}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* ===== Error terakhir & tes kesehatan ===== */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="glass h-full rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <TriangleAlert size={17} className="text-red-300" />
              <p className="font-semibold">Error Terakhir</p>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {lastErrors.length === 0 && <p className="text-sm text-zinc-500">Belum ada error tercatat untuk provider ini.</p>}
              {lastErrors.map((l, i) => (
                <div key={i} className="text-sm">
                  <span className="font-mono text-xs text-zinc-500">{fmtTime(l.at)}</span>{" "}
                  <span className="font-medium text-zinc-200">{l.modelId}</span>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-red-300/80">{l.error}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="glass h-full rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <Activity size={17} className="text-lime-300" />
              <p className="font-semibold">Tes Kesehatan Terakhir per Model</p>
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              {health.length === 0 && <p className="text-sm text-zinc-500">Belum ada hasil tes untuk model provider ini.</p>}
              {health.map((h) => (
                <div key={h.modelId} className="flex flex-wrap items-center gap-2.5 text-sm">
                  <span className="font-medium text-zinc-200">{h.modelId}</span>
                  {okPill(h.status === "SUCCESS")}
                  <span className="text-xs text-zinc-500">{fmtLatency(h.latencyMs)} · {fmtTime(h.checkedAt)}</span>
                  {h.error && <span className="w-full break-words text-xs text-red-300/80">{h.error}</span>}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      {confirmKey && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus key hulu ini?"
          description={
            <>
              Key <span className="font-medium text-zinc-200">{confirmKey.label}</span> dari provider{" "}
              {provider.name} akan dihapus permanen dan tidak dipakai lagi untuk melayani request.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={confirmBusy}
          onCancel={() => setConfirmKey(null)}
          onConfirm={doConfirmDeleteKey}
        />
      )}
    </div>
  );
}
