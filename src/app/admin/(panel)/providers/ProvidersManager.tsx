"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Plus, Server, Trash2 } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";

type UpKey = {
  id: string;
  label: string;
  keyHint: string;
  status: string;
  cooldownUntil: string | null;
  failCount: number;
  createdAt: string;
};
type Prov = {
  id: string;
  name: string;
  baseUrl: string;
  isActive: boolean;
  routeCount: number;
  keys: UpKey[];
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";
const btnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

export default function ProvidersManager({ providers }: { providers: Prov[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [err, setErr] = useState("");
  const [confirmProv, setConfirmProv] = useState<Prov | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  async function addProvider(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await call("/api/admin/providers", "POST", { name, baseUrl });
      setName("");
      setBaseUrl("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menambah provider");
    }
  }

  async function doConfirmDelete() {
    if (!confirmProv) return;
    setConfirmBusy(true);
    setErr("");
    try {
      await call(`/api/admin/providers/${confirmProv.id}`, "DELETE");
      setConfirmProv(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus");
      setConfirmProv(null);
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
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Provider</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Layanan hulu (upstream) yang melayani GreenRouter. Detail key, kapasitas, dan
          diagnosis tiap provider ada di halaman diagnosisnya masing-masing.
        </p>
      </Reveal>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {err}
        </p>
      )}

      <Reveal>
        <form onSubmit={addProvider} className="glass mt-8 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Server size={19} />
            </span>
            <p className="font-semibold sm:text-lg">Provider Baru</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
            <input className={inputCls} placeholder="Nama (mis. LarpRouter)" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className={inputCls} placeholder="Base URL (mis. https://larprouter.com/v1)" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} required />
            <button type="submit" className={btnCls}>
              <Plus size={16} /> Tambah Provider
            </button>
          </div>
        </form>
      </Reveal>

      <div className="mt-6 flex flex-col gap-4">
        {providers.length === 0 && (
          <p className="glass rounded-3xl px-4 py-8 text-center text-zinc-500">
            Belum ada provider.
          </p>
        )}
        {providers.map((p, pi) => {
          const active = p.keys.filter((k) => k.status === "ACTIVE").length;
          const problem = p.keys.filter((k) => k.status === "LIMITED" || k.status === "DISABLED").length;
          return (
            <Reveal key={p.id} delay={pi * 80}>
              <div className="glass rounded-3xl p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                    <Server size={19} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-semibold">{p.name}</h2>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-400">
                        {p.routeCount} route model
                      </span>
                    </div>
                    <code className="mt-0.5 block break-all font-mono text-xs text-zinc-400">{p.baseUrl}</code>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await call(`/api/admin/providers/${p.id}`, "PATCH", { isActive: !p.isActive });
                        router.refresh();
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        p.isActive ? "bg-lime-400/10 text-lime-300" : "bg-zinc-500/15 text-zinc-400"
                      }`}
                    >
                      {p.isActive ? "AKTIF" : "NONAKTIF"}
                    </button>
                    <button
                      onClick={() => setConfirmProv(p)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                      title="Hapus provider"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/[0.05] pt-5">
                  <p className="text-sm text-zinc-400">
                    {p.keys.length} key hulu · <span className="text-lime-300">{active} aktif</span>
                    {problem > 0 && (
                      <>
                        {" "}· <span className="text-red-300">{problem} butuh tindakan</span>
                      </>
                    )}
                  </p>
                  <Link
                    href={`/admin/providers/${p.id}`}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-lime-300/25 px-4 py-2 text-sm font-medium text-lime-200 transition hover:bg-lime-400/10"
                  >
                    <Activity size={15} /> Diagnosis
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {confirmProv && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus provider ini?"
          description={
            <>
              Provider <span className="font-medium text-zinc-200">{confirmProv.name}</span> akan dihapus
              permanen. Semua key hulu dan route model milik provider ini ikut terhapus.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={confirmBusy}
          onCancel={() => setConfirmProv(null)}
          onConfirm={doConfirmDelete}
        />
      )}
    </div>
  );
}
