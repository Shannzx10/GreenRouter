"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Plus, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";

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

export default function ClientKeysManager({ keys }: { keys: ClientKey[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ClientKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErr("");
    try {
      await call(`/api/admin/client-keys/${deleteTarget.id}`, "DELETE");
      setDeleteTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus key");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
      const res = await call("/api/admin/client-keys", "POST", { name });
      const d = (await res.json()) as { fullKey: string };
      setNewKey(d.fullKey);
      setCopied(false);
      setName("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal membuat key");
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
          Panel Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Key Klien</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Key <code className="font-mono">gr-…</code> yang dipakai aplikasi klien (OpenCode, Codex, dll.)
          untuk mengakses <code className="font-mono">/v1</code>. Nilai penuh key hanya tampil
          sekali saat dibuat, yang tersimpan hanya hash-nya.
        </p>
      </Reveal>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>
      )}

      {newKey && (
        <div className="mt-4 rounded-3xl border border-lime-300/30 bg-lime-400/[0.07] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-lime-200">Key baru dibuat, salin sekarang, tidak akan ditampilkan lagi:</p>
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

      <Reveal>
        <div className="glass mt-8 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <KeyRound size={19} />
            </span>
            <p className="font-semibold sm:text-lg">Key Klien Baru</p>
          </div>
          <form onSubmit={create} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input className={inputCls} placeholder="Nama key (mis. OpenCode HP)" value={name} onChange={(e) => setName(e.target.value)} required />
            <button type="submit" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              <Plus size={16} /> Buat Key
            </button>
          </form>
        </div>
      </Reveal>

      <Reveal>
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
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">Belum ada key klien.</td>
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
                      await call(`/api/admin/client-keys/${k.id}`, "PATCH", { isActive: !k.isActive });
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
      </Reveal>

      {deleteTarget && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus key klien ini?"
          description={
            <>
              Key <span className="font-medium text-zinc-200">{deleteTarget.name}</span> akan dihapus permanen.
              Klien yang memakainya langsung kehilangan akses.
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
