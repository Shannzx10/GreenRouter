"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Gauge, Plus, RotateCcw, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";

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
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";

function fmt(d: string | null) {
  if (!d) return "-";
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
  const isMax = planId === "max";
  const atLimit = keys.length >= apiKeyLimit;

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Key Saya</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Kelola API key milikmu, buat yang baru, rotate, atau cabut yang sudah tidak dipakai.
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Kamu memakai {keys.length} dari {apiKeyLimit} key pada plan {planName}.
      </p>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>
      )}

      {newKey && (
        <div className="mt-4 rounded-3xl border border-lime-300/30 bg-lime-400/[0.07] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-lime-200">{keyNotice}, salin sekarang, tidak akan ditampilkan lagi:</p>
            <button onClick={() => setNewKey("")} className="text-lime-300 hover:text-lime-100">
              <X size={16} />
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl bg-black/40 px-3 py-2.5 font-mono text-sm text-lime-300">{newKey}</code>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(newKey);
                setCopied(true);
              }}
              className="inline-flex items-center justify-center gap-1 rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>
      )}

      {atLimit ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-400">
          Batas {apiKeyLimit} key untuk plan {planName} sudah tercapai. Hapus key lama
          atau naik plan untuk membuat key baru.
        </p>
      ) : (
        <form onSubmit={create} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input className={inputCls} placeholder="Nama key (mis. OpenCode di laptop)" value={name} onChange={(e) => setName(e.target.value)} required disabled={atLimit} />
          {isMax && (
            <input
              className={`${inputCls} sm:max-w-60`}
              type="number"
              min="1"
              placeholder="Batas token per siklus (opsional)"
              value={createLimit}
              onChange={(e) => setCreateLimit(e.target.value)}
              title="Batas token per siklus 7 hari untuk key ini, khusus plan Max"
            />
          )}
          <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
            <Plus size={16} /> Buat Key
          </button>
        </form>
      )}

      <div className="mt-6 overflow-x-auto glass rounded-3xl">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-white/[0.04] text-zinc-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Nama</th>
              <th className="px-4 py-2.5 font-medium">Prefix</th>
              <th className="px-4 py-2.5 font-medium">Dibuat</th>
              <th className="px-4 py-2.5 font-medium">Terakhir Dipakai</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Belum ada key. Buat yang pertama di atas.</td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-white/[0.05]">
                <td className="px-4 py-2.5 font-medium">
                  {k.name}
                  {k.tokenLimit != null && (
                    <span className="block text-xs font-normal text-zinc-500">
                      Batas {k.tokenLimit.toLocaleString("id-ID")} token per siklus
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{k.prefix}…</td>
                <td className="px-4 py-2.5 text-zinc-400">{fmt(k.createdAt)}</td>
                <td className="px-4 py-2.5 text-zinc-400">{fmt(k.lastUsedAt)}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={async () => {
                      await call(`/api/user/keys/${k.id}`, "PATCH", { isActive: !k.isActive });
                      router.refresh();
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      k.isActive ? "bg-lime-400/10 text-lime-300" : "bg-zinc-500/15 text-zinc-400"
                    }`}
                  >
                    {k.isActive ? "AKTIF" : "NONAKTIF"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {isMax && (
                    <button
                      onClick={() => {
                        setLimitTarget(k);
                        setLimitValue(k.tokenLimit?.toString() ?? "");
                      }}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-lime-300"
                      title="Atur batas token per siklus untuk key ini"
                    >
                      <Gauge size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => setRotateTarget(k)}
                    className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-lime-300"
                    title="Rotate key (ganti nilai rahasia)"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(k)}
                    className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                    title="Hapus key"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">Batas Token Key</h2>
              <button onClick={() => setLimitTarget(null)} className="text-zinc-400 hover:text-zinc-100">
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
            />
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={saveLimit}
                disabled={savingLimit}
                className="flex-1 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-60"
              >
                {savingLimit ? "Menyimpan..." : "Simpan Batas"}
              </button>
              <button
                onClick={() => setLimitTarget(null)}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
