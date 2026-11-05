"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";
import { PageHeader, PANEL } from "@/app/app/ui";

type ClientKey = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";

function fmt(d: string | null) {
  if (!d) return "Belum pernah";
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

  async function toggleKey(k: ClientKey) {
    setErr("");
    try {
      await call(`/api/admin/client-keys/${k.id}`, "PATCH", { isActive: !k.isActive });
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal mengubah status key");
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setErr("Gagal menyalin otomatis. Blok teks key lalu salin secara manual.");
    }
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

  const activeCount = keys.filter((x) => x.isActive).length;

  const statusSwitch = (key: ClientKey) => (
    <button
      type="button"
      role="switch"
      aria-checked={key.isActive}
      aria-label={`${key.isActive ? "Nonaktifkan" : "Aktifkan"} key ${key.name}`}
      onClick={() => toggleKey(key)}
      className="inline-flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60"
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${key.isActive ? "border-lime-300/50 bg-lime-400/30" : "border-white/10 bg-white/[0.06]"}`}>
        <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all ${key.isActive ? "left-[22px] bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.7)]" : "left-0.5 bg-zinc-500"}`} />
      </span>
      <span className={`text-xs font-semibold tracking-wide ${key.isActive ? "text-lime-300" : "text-zinc-500"}`}>
        {key.isActive ? "AKTIF" : "NONAKTIF"}
      </span>
    </button>
  );

  const delBtn = (key: ClientKey, label?: string) => (
    <button
      onClick={() => setDeleteTarget(key)}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-2 text-xs font-medium text-zinc-300 outline-none transition hover:border-red-400/40 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-lime-300/60"
      title="Hapus key"
      aria-label={`Hapus key ${key.name}`}
    >
      <Trash2 size={15} /> {label}
    </button>
  );

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Panel Admin" title="Key Klien">
        <p>
          Key <code className="font-mono">gr-…</code> yang dipakai aplikasi klien (OpenCode, Codex, dll.)
          untuk mengakses <code className="font-mono">/v1</code>. Nilai penuh key hanya tampil
          sekali saat dibuat, yang tersimpan hanya hash-nya.
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

        {newKey && (
          <div className="mt-5 rounded-3xl border border-lime-300/35 bg-lime-400/[0.07] p-4 shadow-[0_20px_60px_-30px_rgba(163,230,53,0.5)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-2.5 text-sm font-medium leading-relaxed text-lime-200">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                Key baru dibuat, salin sekarang, tidak akan ditampilkan lagi:
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

      <Reveal>
        <form onSubmit={create} className={`${PANEL} mt-6 p-5`}>
          <p className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <KeyRound size={16} />
            </span>
            Key Klien Baru
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="mb-1.5 block text-xs text-zinc-500">Nama key</span>
              <input className={inputCls} placeholder="Nama key (mis. OpenCode HP)" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <button type="submit" className="btn-shine inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              <Plus size={16} /> Buat Key
            </button>
          </div>
        </form>
      </Reveal>

      <Reveal>
        <div className={`${PANEL} mt-4 overflow-hidden`}>
          {keys.length > 0 && (
            <p className="border-b border-white/[0.07] px-5 py-3 text-sm text-zinc-400">
              <span className="font-semibold text-zinc-100">{keys.length}</span> key klien
              <span className="text-zinc-600"> · </span>
              {activeCount} aktif
            </p>
          )}
          {keys.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                <KeyRound size={20} />
              </span>
              <p className="mt-4 text-sm text-zinc-500">Belum ada key klien.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.06] md:hidden">
                {keys.map((key) => (
                  <li key={key.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{key.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">{key.prefix}…</p>
                      </div>
                      {statusSwitch(key)}
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="text-zinc-500">Dibuat</dt>
                        <dd className="mt-0.5 text-zinc-300">{fmt(key.createdAt)}</dd>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                        <dt className="text-zinc-500">Terakhir Dipakai</dt>
                        <dd className="mt-0.5 text-zinc-300">{fmt(key.lastUsedAt)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3">{delBtn(key, "Hapus")}</div>
                  </li>
                ))}
              </ul>
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
                    {keys.map((key) => (
                      <tr key={key.id} className="border-t border-white/[0.05] transition hover:bg-white/[0.025]">
                        <td className="px-4 py-3 font-medium">{key.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmt(key.createdAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{fmt(key.lastUsedAt)}</td>
                        <td className="px-4 py-3">{statusSwitch(key)}</td>
                        <td className="px-4 py-3 text-right">{delBtn(key)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
