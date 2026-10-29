"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, RotateCcw, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";

type ClientKey = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";

function fmt(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function UserKeysManager({ keys }: { keys: ClientKey[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [keyNotice, setKeyNotice] = useState("Key baru dibuat");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [rotateTarget, setRotateTarget] = useState<ClientKey | null>(null);
  const [rotating, setRotating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientKey | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const res = await call("/api/user/keys", "POST", { name });
      const d = (await res.json()) as { fullKey: string };
      setNewKey(d.fullKey);
      setKeyNotice("Key baru dibuat");
      setCopied(false);
      setName("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal membuat key");
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

      <form onSubmit={create} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input className={inputCls} placeholder="Nama key (mis. OpenCode di laptop)" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
          <Plus size={16} /> Buat Key
        </button>
      </form>

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
                <td className="px-4 py-2.5 font-medium">{k.name}</td>
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
    </div>
  );
}
