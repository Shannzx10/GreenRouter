"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Gauge, KeyRound, Plus, RotateCcw, ShieldAlert, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import { PageHeader, PANEL } from "../ui";

type ClientKey = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  tokenLimit: number | null;
  lastUsedAt: string | null;
  createdAt: string;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";

function fmt(d: string | null) {
  if (!d) return "Belum pernah";
  return new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function UserKeysManager({
  keys,
  planId,
  planName,
  apiKeyLimit,
}: {
  keys: ClientKey[];
  planId: string;
  planName: string;
  apiKeyLimit: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [createLimit, setCreateLimit] = useState("");
  const [newKey, setNewKey] = useState("");
  const [keyNotice, setKeyNotice] = useState("Key baru dibuat");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [rotateTarget, setRotateTarget] = useState<ClientKey | null>(null);
  const [rotating, setRotating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [limitTarget, setLimitTarget] = useState<ClientKey | null>(null);
  const [limitValue, setLimitValue] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [view, setView] = useOptimistic(keys, (s, p: { id: string; isActive: boolean }) =>
    s.map((k) => (k.id === p.id ? { ...k, isActive: p.isActive } : k)),
  );
  const isMax = planId === "max";
  const atLimit = keys.length >= apiKeyLimit;

  useEffect(() => {
    if (!limitTarget) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLimitTarget(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [limitTarget]);

  function toggle(k: ClientKey) {
    startTransition(async () => {
      setView({ id: k.id, isActive: !k.isActive });
      try {
        await call(`/api/user/keys/${k.id}`, "PATCH", { isActive: !k.isActive });
        router.refresh();
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Gagal mengubah status key");
      }
    });
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setErr("Gagal menyalin otomatis. Blok teks key lalu salin secara manual.");
    }
  }

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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const body: { name: string; tokenLimit?: number } = { name };
      if (isMax && createLimit.trim()) {
        const n = Number(createLimit);
        if (!Number.isFinite(n) || n <= 0 || Math.round(n) !== n) {
          throw new Error("Batas token key harus bilangan bulat positif");
        }
        body.tokenLimit = n;
      }
      const res = await call("/api/user/keys", "POST", body);
      const d = (await res.json()) as { fullKey: string };
      setNewKey(d.fullKey);
      setKeyNotice("Key baru dibuat");
      setCopied(false);
      setName("");
      setCreateLimit("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal membuat key");
    }
  }

  async function saveLimit() {
    if (!limitTarget) return;
    setSavingLimit(true);
    setErr("");
    try {
      const trimmed = limitValue.trim();
      const tokenLimit = trimmed === "" ? null : Number(trimmed);
      if (tokenLimit !== null && (!Number.isFinite(tokenLimit) || tokenLimit <= 0 || Math.round(tokenLimit) !== tokenLimit)) {
        throw new Error("Batas token key harus bilangan bulat positif, atau kosongkan untuk tanpa batas");
      }
      await call(`/api/user/keys/${limitTarget.id}`, "PATCH", { tokenLimit });
      setLimitTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan batas key");
      setLimitTarget(null);
    } finally {
      setSavingLimit(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErr("");
    try {
      await call(`/api/user/keys/${deleteTarget.id}`, "DELETE");
      setDeleteTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus key");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function rotate() {
    if (!rotateTarget) return;
    setRotating(true);
    setErr("");
    try {
      const res = await call(`/api/user/keys/${rotateTarget.id}/rotate`, "POST", {});
      const d = (await res.json()) as { fullKey: string };
      setNewKey(d.fullKey);
      setKeyNotice(`Key "${rotateTarget.name}" berhasil di-rotate`);
      setCopied(false);
      setRotateTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal me-rotate key");
      setRotateTarget(null);
    } finally {
      setRotating(false);
    }
  }

  const activeCount = view.filter((k) => k.isActive).length;

  const statusSwitch = (k: ClientKey) => (
    <button
      type="button"
      role="switch"
      aria-checked={k.isActive}
      aria-label={`${k.isActive ? "Nonaktifkan" : "Aktifkan"} key ${k.name}`}
      onClick={() => toggle(k)}
      className="inline-flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60"
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          k.isActive ? "border-lime-300/50 bg-lime-400/30" : "border-white/10 bg-white/[0.06]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${
            k.isActive ? "left-[22px] bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.7)]" : "left-0.5 bg-zinc-500"
          }`}
        />
      </span>
      <span className={`text-xs font-semibold tracking-wide ${k.isActive ? "text-lime-300" : "text-zinc-500"}`}>
        {k.isActive ? "AKTIF" : "NONAKTIF"}
      </span>
    </button>
  );

  const iconBtn =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2 text-xs font-medium text-zinc-300 outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ";
  const actions = (k: ClientKey, labeled: boolean) => (
    <div className={labeled ? "grid grid-cols-3 gap-2" : "flex items-center justify-end gap-1.5"}>
      {isMax && (
        <button
          onClick={() => {
            setLimitTarget(k);
            setLimitValue(k.tokenLimit?.toString() ?? "");
          }}
          className={iconBtn + "hover:border-lime-300/40 hover:text-lime-200"}
          title="Atur batas token per siklus untuk key ini"
          aria-label={`Atur batas token key ${k.name}`}
        >
          <Gauge size={15} /> {labeled && "Batas"}
        </button>
      )}
      <button
        onClick={() => setRotateTarget(k)}
        className={iconBtn + "hover:border-lime-300/40 hover:text-lime-200"}
        title="Rotate key (ganti nilai rahasia)"
        aria-label={`Rotate key ${k.name}`}
      >
        <RotateCcw size={15} /> {labeled && "Rotate"}
      </button>
      <button
        onClick={() => setDeleteTarget(k)}
        className={iconBtn + "hover:border-red-400/40 hover:text-red-300"}
        title="Hapus key"
        aria-label={`Hapus key ${k.name}`}
      >
        <Trash2 size={15} /> {labeled && "Hapus"}
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="API Key" title="Key Saya">
        <p>Kelola API key milikmu, buat yang baru, rotate, atau cabut yang sudah tidak dipakai.</p>
      </PageHeader>

      {/* Pemakaian slot key */}
      <div className={`${PANEL} mt-6 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="text-sm text-zinc-400">
          Kamu memakai <span className="font-semibold text-zinc-100">{keys.length}</span> dari{" "}
          <span className="font-semibold text-zinc-100">{apiKeyLimit}</span> key pada plan{" "}
          <span className="font-semibold text-lime-200">{planName}</span>.
          <span className="text-zinc-600"> · </span>
          <span className="text-zinc-500">{activeCount} aktif</span>
        </p>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: apiKeyLimit }).map((_, i) => (
            <span key={i} className={`h-2 w-5 rounded-full sm:w-6 ${i < keys.length ? "bg-lime-400" : "bg-white/[0.08]"}`} />
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {err && (
          <p role="alert" className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {err}
            <button onClick={() => setErr("")} aria-label="Tutup pesan" className="shrink-0 text-red-300/70 hover:text-red-200">
              <X size={15} />
            </button>
          </p>
        )}

        {newKey && (
          <div className="mt-4 rounded-3xl border border-lime-300/35 bg-lime-400/[0.07] p-4 shadow-[0_20px_60px_-30px_rgba(163,230,53,0.5)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-lime-200">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                {keyNotice}, salin sekarang, tidak akan ditampilkan lagi:
              </p>
              <button onClick={() => setNewKey("")} aria-label="Tutup" className="shrink-0 text-lime-300 hover:text-lime-100">
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 select-all break-all rounded-xl border border-white/10 bg-black/50 px-3.5 py-3 font-mono text-sm text-lime-300">{newKey}</code>
              <button
                onClick={copyKey}
                className="btn-shine inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Tersalin" : "Salin"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Buat key */}
      {atLimit ? (
        <div className={`${PANEL} mt-6 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="text-sm leading-relaxed text-zinc-400">
            Batas {apiKeyLimit} key untuk plan {planName} sudah tercapai. Hapus key lama
            atau naik plan untuk membuat key baru.
          </p>
          <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-full border border-lime-300/30 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/20">
            Lihat Plan
          </Link>
        </div>
      ) : (
        <form onSubmit={create} className={`${PANEL} mt-6 p-5`}>
          <p className="text-sm font-semibold">Buat key baru</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs text-zinc-500">Nama key</span>
              <input
                ref={nameRef}
                className={inputCls}
                placeholder="Nama key (mis. OpenCode di laptop)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={atLimit}
              />
            </label>
            {isMax && (
              <label className="block sm:w-64">
                <span className="mb-1.5 block text-xs text-zinc-500">Batas token (opsional)</span>
                <input
                  className={inputCls}
                  type="number"
                  min="1"
                  placeholder="Batas token per siklus (opsional)"
                  value={createLimit}
                  onChange={(e) => setCreateLimit(e.target.value)}
                  title="Batas token per siklus 7 hari untuk key ini, khusus plan Max"
                />
              </label>
            )}
            <button type="submit" className="btn-shine inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              <Plus size={16} /> Buat Key
            </button>
          </div>
        </form>
      )}

      {/* Daftar key */}
      <div className={`${PANEL} mt-4 overflow-hidden`}>
        {view.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <KeyRound size={20} />
            </span>
            <p className="mt-4 text-sm text-zinc-400">Belum ada key. Buat yang pertama di atas.</p>
            {!atLimit && (
              <button
                onClick={() => nameRef.current?.focus()}
                className="mt-4 text-sm font-medium text-lime-300 transition hover:text-lime-200"
              >
                Isi nama key
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile: kartu */}
            <ul className="divide-y divide-white/[0.06] md:hidden">
              {view.map((k) => (
                <li key={k.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{k.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">{k.prefix}…</p>
                    </div>
                    {statusSwitch(k)}
                  </div>
                  {k.tokenLimit != null && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Batas {k.tokenLimit.toLocaleString("id-ID")} token per siklus
                    </p>
                  )}
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <dt className="text-zinc-500">Dibuat</dt>
                      <dd className="mt-0.5 text-zinc-300">{fmt(k.createdAt)}</dd>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <dt className="text-zinc-500">Terakhir Dipakai</dt>
                      <dd className="mt-0.5 text-zinc-300">{fmt(k.lastUsedAt)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">{actions(k, true)}</div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-white/[0.03] text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Prefix</th>
                    <th className="px-4 py-3 font-medium">Dibuat</th>
                    <th className="px-4 py-3 font-medium">Terakhir Dipakai</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {view.map((k) => (
                    <tr key={k.id} className="border-t border-white/[0.05] transition hover:bg-white/[0.025]">
                      <td className="px-4 py-3 font-medium">
                        {k.name}
                        {k.tokenLimit != null && (
                          <span className="block text-xs font-normal text-zinc-500">
                            Batas {k.tokenLimit.toLocaleString("id-ID")} token per siklus
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{k.prefix}…</td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmt(k.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmt(k.lastUsedAt)}</td>
                      <td className="px-4 py-3">{statusSwitch(k)}</td>
                      <td className="px-4 py-3">{actions(k, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {rotateTarget && (
        <ConfirmModal
          icon={RotateCcw}
          title="Rotate key ini?"
          description={
            <>
              Nilai rahasia key <span className="font-medium text-zinc-200">{rotateTarget.name}</span> akan diganti
              dengan yang baru. Nilai lama langsung berhenti bekerja, jadi tool yang memakai key ini harus diperbarui.
              Nama, status, dan riwayat pemakaian tetap sama.
            </>
          }
          confirmLabel="Ya, Rotate"
          busy={rotating}
          onCancel={() => setRotateTarget(null)}
          onConfirm={rotate}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus key ini?"
          description={
            <>
              Key <span className="font-medium text-zinc-200">{deleteTarget.name}</span> akan dihapus permanen.
              Tool yang memakainya langsung kehilangan akses dan tidak bisa dikembalikan.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDelete}
        />
      )}

      {limitTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => !savingLimit && setLimitTarget(null)}>
          <form
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              saveLimit();
            }}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">Batas Token Key</h2>
              <button type="button" aria-label="Tutup" onClick={() => setLimitTarget(null)} className="text-zinc-400 hover:text-zinc-100">
                <X size={18} />
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              Batas pemakaian token per siklus 7 hari untuk key{" "}
              <span className="font-medium text-zinc-200">{limitTarget.name}</span>. Kosongkan
              untuk tanpa batas per key (kuota akun tetap berlaku).
            </p>
            <input
              className={`${inputCls} mt-4`}
              type="number"
              min="1"
              placeholder="Mis. 1000000"
              value={limitValue}
              onChange={(e) => setLimitValue(e.target.value)}
              autoFocus
            />
            <div className="mt-5 flex gap-2.5">
              <button
                type="submit"
                disabled={savingLimit}
                className="flex-1 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-60"
              >
                {savingLimit ? "Menyimpan..." : "Simpan Batas"}
              </button>
              <button
                type="button"
                onClick={() => setLimitTarget(null)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
