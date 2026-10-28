"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, RotateCcw, Server, Trash2 } from "lucide-react";
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
  rateLimits: { modelId: string; until: string }[];
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
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
        COOLDOWN{k.cooldownUntil ? ` s.d. ${new Date(k.cooldownUntil).toLocaleTimeString("id-ID")}` : ""}
      </span>
    );
  return <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs text-zinc-400">NONAKTIF</span>;
}

export default function ProvidersManager({ providers }: { providers: Prov[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [err, setErr] = useState("");
  const [keyForms, setKeyForms] = useState<Record<string, { label: string; key: string }>>({});
  const [confirmState, setConfirmState] = useState<
    | { kind: "provider"; p: Prov }
    | { kind: "key"; p: Prov; k: UpKey }
    | null
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  async function doConfirmDelete() {
    if (!confirmState) return;
    setConfirmBusy(true);
    setErr("");
    try {
      if (confirmState.kind === "provider") {
        await call(`/api/admin/providers/${confirmState.p.id}`, "DELETE");
      } else {
        await call(`/api/admin/upstream-keys/${confirmState.k.id}`, "DELETE");
      }
      setConfirmState(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus");
      setConfirmState(null);
    } finally {
      setConfirmBusy(false);
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

  async function addKey(providerId: string) {
    const f = keyForms[providerId] ?? { label: "", key: "" };
    if (!f.key.trim()) return;
    setErr("");
    try {
      await call(`/api/admin/providers/${providerId}/keys`, "POST", f);
      setKeyForms((s) => ({ ...s, [providerId]: { label: "", key: "" } }));
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menambah key");
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
          Layanan hulu (upstream) beserta API key-nya. Key tersimpan terenkripsi dan tidak
          pernah ditampilkan utuh lagi.
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
          const f = keyForms[p.id] ?? { label: "", key: "" };
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
                      onClick={() => setConfirmState({ kind: "provider", p })}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                      title="Hapus provider"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Key Hulu ({p.keys.length})
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {p.keys.length === 0 && <p className="text-sm text-zinc-500">Belum ada key untuk provider ini.</p>}
                  {p.keys.map((k) => (
                    <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-2.5">
                      <KeyRound size={15} className="text-zinc-500" />
                      <span className="text-sm font-medium">{k.label}</span>
                      <code className="font-mono text-xs text-zinc-400">{k.keyHint}</code>
                      {statusBadge(k)}
                      {k.rateLimits.map((rl) => (
                        <span
                          key={rl.modelId}
                          className="rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-xs text-amber-300"
                          title="Key ini sedang kena rate-limit khusus model ini"
                        >
                          429 {rl.modelId} s.d. {new Date(rl.until).toLocaleTimeString("id-ID")}
                        </span>
                      ))}
                      {k.failCount > 0 && <span className="text-xs text-zinc-500">gagal: {k.failCount}×</span>}
                      <div className="ml-auto flex items-center gap-1">
                        {k.status !== "ACTIVE" && (
                          <button
                            onClick={async () => {
                              await call(`/api/admin/upstream-keys/${k.id}`, "PATCH", { status: "ACTIVE" });
                              router.refresh();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-lime-300 transition hover:bg-white/[0.06]"
                          >
                            <RotateCcw size={13} /> Aktifkan
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmState({ kind: "key", p, k })}
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                          title="Hapus key"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 border-t border-white/[0.05] pt-5 sm:grid-cols-[1fr_1.5fr_auto]">
                  <input
                    className={inputCls}
                    placeholder="Label key (opsional)"
                    value={f.label}
                    onChange={(e) => setKeyForms((s) => ({ ...s, [p.id]: { ...f, label: e.target.value } }))}
                  />
                  <input
                    className={inputCls}
                    type="password"
                    placeholder="API key baru untuk provider ini"
                    value={f.key}
                    onChange={(e) => setKeyForms((s) => ({ ...s, [p.id]: { ...f, key: e.target.value } }))}
                  />
                  <button onClick={() => addKey(p.id)} className={btnCls} disabled={!f.key.trim()}>
                    <Plus size={16} /> Tambah Key
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {confirmState && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title={confirmState.kind === "provider" ? "Hapus provider ini?" : "Hapus key hulu ini?"}
          description={
            confirmState.kind === "provider" ? (
              <>
                Provider <span className="font-medium text-zinc-200">{confirmState.p.name}</span> akan dihapus
                permanen. Semua key hulu dan route model milik provider ini ikut terhapus.
              </>
            ) : (
              <>
                Key <span className="font-medium text-zinc-200">{confirmState.k.label}</span> dari provider{" "}
                {confirmState.p.name} akan dihapus permanen dan tidak dipakai lagi untuk melayani request.
              </>
            )
          }
          confirmLabel="Ya, Hapus"
          busy={confirmBusy}
          onCancel={() => setConfirmState(null)}
          onConfirm={doConfirmDelete}
        />
      )}
    </div>
  );
}
