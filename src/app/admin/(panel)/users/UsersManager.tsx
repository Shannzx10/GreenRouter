"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Pencil, Search, Trash2, Undo2, Users, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";
import { PageHeader, PANEL, Pill } from "@/app/app/ui";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  authProviders: string;
  role: string;
  suspendedAt: string | null;
  suspendReason: string | null;
  tokenLimit: number | null;
  requestLimitHourly: number | null;
  keyCount: number;
  usedThisCycle: number;
  createdAt: string;
  isSelf: boolean;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";
const btnCls =
  "btn-shine inline-flex items-center justify-center gap-1.5 rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

function fmtNum(n: number) {
  return n.toLocaleString("id-ID");
}

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [unsuspendTarget, setUnsuspendTarget] = useState<UserRow | null>(null);
  const [unsuspending, setUnsuspending] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"semua" | "aktif" | "suspend" | "admin">("semua");

  async function doSuspend() {
    if (!suspendTarget) return;
    setSuspending(true);
    setErr("");
    try {
      await call(`/api/admin/users/${suspendTarget.id}`, "PATCH", {
        suspended: true,
        suspendReason: suspendReason.trim() || undefined,
      });
      setSuspendTarget(null);
      setSuspendReason("");
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal mensuspend user");
      setSuspendTarget(null);
    } finally {
      setSuspending(false);
    }
  }

  async function doUnsuspend() {
    if (!unsuspendTarget) return;
    setUnsuspending(true);
    setErr("");
    try {
      await call(`/api/admin/users/${unsuspendTarget.id}`, "PATCH", { suspended: false });
      setUnsuspendTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal membatalkan suspend");
      setUnsuspendTarget(null);
    } finally {
      setUnsuspending(false);
    }
  }

  async function doDeleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErr("");
    try {
      await call(`/api/admin/users/${deleteTarget.id}`, "DELETE");
      setDeleteTarget(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menghapus user");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "USER", limit: "", hourly: "" });

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

  function startEdit(u: UserRow) {
    setEditing(u.id);
    setEditForm({
      name: u.name ?? "",
      email: u.email,
      role: u.role,
      limit: u.tokenLimit?.toString() ?? "",
      hourly: u.requestLimitHourly?.toString() ?? "",
    });
    setErr("");
  }

  async function saveEdit(u: UserRow) {
    setErr("");
    try {
      await call(`/api/admin/users/${u.id}`, "PATCH", {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        tokenLimit: editForm.limit ? parseInt(editForm.limit, 10) : null,
        requestLimitHourly: editForm.hourly ? parseInt(editForm.hourly, 10) : null,
      });
      setEditing(null);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Gagal menyimpan");
    }
  }

  const q = query.trim().toLowerCase();
  const shown = users.filter((u) => {
    if (filter === "aktif" && u.suspendedAt) return false;
    if (filter === "suspend" && !u.suspendedAt) return false;
    if (filter === "admin" && u.role !== "ADMIN") return false;
    return !q || u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
  });
  const count = {
    semua: users.length,
    aktif: users.filter((u) => !u.suspendedAt).length,
    suspend: users.filter((u) => u.suspendedAt).length,
    admin: users.filter((u) => u.role === "ADMIN").length,
  };
  const chip = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
      on
        ? "bg-lime-400 font-semibold text-zinc-950 shadow-[0_6px_20px_-6px_rgba(163,230,53,0.6)]"
        : "border border-white/10 text-zinc-300 hover:border-lime-300/40 hover:text-lime-200"
    }`;
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-zinc-400 outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 ";

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <PageHeader eyebrow="Panel Admin" title="Pengguna">
        <p>
          Kelola akun user yang mendaftar lewat Google/GitHub: data diri, role, suspend, dan
          limit token per siklus 7 hari. Akun baru hanya lahir dari pendaftaran OAuth, tidak ada pembuatan
          user manual. User yang disuspend terkunci ke halaman suspend dan key API-nya berhenti bekerja;
          bila suspend tidak dibatalkan dalam 3 hari, akun terhapus permanen dan emailnya masuk daftar
          hitam. Menghapus user juga menghapus semua key miliknya.
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
      </div>

      {/* Cari + saring */}
      <div className={`${PANEL} mt-6 p-4 sm:p-5`}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau email"
            aria-label="Cari pengguna"
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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {(
            [
              ["semua", "Semua"],
              ["aktif", "Aktif"],
              ["suspend", "Disuspend"],
              ["admin", "Admin"],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={chip(filter === k)}>
              {label}
              <span className={`text-[10px] ${filter === k ? "text-zinc-950/60" : "text-zinc-500"}`}>{count[k]}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 border-t border-white/[0.07] pt-3 text-sm text-zinc-400" aria-live="polite">
          Menampilkan <span className="font-semibold text-zinc-100">{shown.length}</span> dari {users.length} pengguna
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {shown.length === 0 && (
          <div className={`${PANEL} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-400">
              <Users size={20} />
            </span>
            <p className="mt-4 text-sm text-zinc-400">Tidak ada pengguna yang cocok.</p>
          </div>
        )}
        {shown.map((u, ui) => {
          const pct = u.tokenLimit
            ? Math.min(100, Math.round((u.usedThisCycle / u.tokenLimit) * 100))
            : null;
          const isEditing = editing === u.id;
          const providers = u.authProviders
            .split(",")
            .map((p) => (p === "google" ? "Google" : p === "github" ? "GitHub" : "password"))
            .join(" + ");
          return (
            <Reveal key={u.id} delay={Math.min(ui, 6) * 60}>
              <div className={`${PANEL} p-4 transition sm:p-6 ${isEditing ? "border-lime-300/30" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  {u.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.image}
                      alt={u.name ?? u.email}
                      className="h-11 w-11 shrink-0 rounded-2xl object-cover ring-1 ring-white/15"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-base font-bold text-lime-300 ring-1 ring-lime-300/20">
                      {(u.name ?? u.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-semibold">
                      {u.name ?? u.email.split("@")[0]}
                      {u.isSelf && <span className="ml-2 text-xs font-normal text-zinc-500">(kamu)</span>}
                    </p>
                    <p className="truncate text-sm text-zinc-400">{u.email}</p>
                    <p className="text-xs text-zinc-500">masuk via {providers}</p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                    <Pill className={`px-2.5 py-1 font-medium ${u.role === "ADMIN" ? "bg-lime-400/15 text-lime-200" : "bg-white/[0.06] text-zinc-300"}`}>
                      {u.role}
                    </Pill>
                    <button
                      disabled={u.isSelf}
                      onClick={() => (u.suspendedAt ? setUnsuspendTarget(u) : setSuspendTarget(u))}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-lime-300/60 disabled:opacity-40 ${
                        u.suspendedAt ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-lime-400/10 text-lime-300 hover:bg-lime-400/20"
                      }`}
                      title={
                        u.isSelf
                          ? "Akun sendiri tidak bisa disuspend"
                          : u.suspendedAt
                            ? "Batalkan suspend"
                            : "Suspend akun ini"
                      }
                    >
                      {u.suspendedAt ? "DISUSPEND" : "AKTIF"}
                    </button>
                    <span className="ml-auto flex gap-1.5">
                      <button
                        onClick={() => (isEditing ? setEditing(null) : startEdit(u))}
                        className={iconBtn + "hover:border-lime-300/40 hover:text-lime-200"}
                        title="Edit user"
                        aria-label={`${isEditing ? "Tutup edit" : "Edit"} user ${u.email}`}
                      >
                        {isEditing ? <X size={16} /> : <Pencil size={16} />}
                      </button>
                      {!u.isSelf && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className={iconBtn + "hover:border-red-400/40 hover:text-red-300"}
                          title="Hapus user"
                          aria-label={`Hapus user ${u.email}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </span>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    ["Key", `${u.keyCount}`],
                    ["Terpakai siklus ini", `${fmtNum(u.usedThisCycle)} token`],
                    ["Limit token", u.tokenLimit ? `${fmtNum(u.tokenLimit)} / siklus` : "tanpa batas"],
                    ["Limit request", u.requestLimitHourly ? `${fmtNum(u.requestLimitHourly)} / jam` : "tanpa batas"],
                    ["Bergabung", new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })],
                  ].map(([k, v]) => (
                    <div key={k} className="min-w-0 rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <dt className="truncate text-[11px] text-zinc-500">{k}</dt>
                      <dd className="mt-0.5 truncate font-medium tabular-nums text-zinc-100">{v}</dd>
                    </div>
                  ))}
                </dl>

                {pct !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>Pemakaian kuota</span>
                      <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-300" : "bg-lime-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {u.suspendedAt && (
                  <p className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm leading-relaxed text-red-200">
                    Disuspend {new Date(u.suspendedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {u.suspendReason ? <> · alasan: {u.suspendReason}</> : null}
                    {" "}· akun terhapus permanen pada{" "}
                    {new Date(new Date(u.suspendedAt).getTime() + 3 * 24 * 3600 * 1000).toLocaleDateString("id-ID", { dateStyle: "medium" })}{" "}
                    bila tidak dibatalkan.
                  </p>
                )}

                {isEditing && (
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.07] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-zinc-500">Nama</span>
                      <input className={inputCls} placeholder="Nama" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-zinc-500">Email</span>
                      <input className={inputCls} type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-zinc-500">Role</span>
                      <select className={inputCls} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-zinc-500">Limit token per siklus 7 hari</span>
                      <input className={inputCls} type="number" min="0" placeholder="Kosong = ∞" value={editForm.limit} onChange={(e) => setEditForm({ ...editForm, limit: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs text-zinc-500">Limit request per jam</span>
                      <input className={inputCls} type="number" min="0" placeholder="Kosong = ∞" value={editForm.hourly} onChange={(e) => setEditForm({ ...editForm, hourly: e.target.value })} />
                    </label>
                    <div className="flex items-end gap-2">
                      <button onClick={() => saveEdit(u)} className={`${btnCls} flex-1`}>
                        Simpan Perubahan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => !suspending && setSuspendTarget(null)}
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-300 ring-1 ring-red-400/25">
              <Ban size={19} />
            </span>
            <h3 className="mt-4 text-lg font-bold">Suspend user ini?</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              <span className="font-medium text-zinc-200">{suspendTarget.email}</span> akan terkunci ke
              halaman suspend dan semua key API-nya berhenti bekerja. Bila kamu tidak membatalkannya
              dalam <span className="font-medium text-zinc-200">3 hari</span>, akunnya terhapus permanen
              dan email ini masuk daftar hitam.
            </p>
            <textarea
              className={`${inputCls} mt-4 resize-none`}
              rows={2}
              maxLength={300}
              placeholder="Alasan suspend (opsional, tampil ke user)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={suspending}
                onClick={() => setSuspendTarget(null)}
                className="flex-1 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={suspending}
                onClick={doSuspend}
                className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {suspending ? "Memproses..." : "Ya, Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {unsuspendTarget && (
        <ConfirmModal
          icon={Undo2}
          tone="lime"
          title="Batalkan suspend?"
          description={
            <>
              Suspend <span className="font-medium text-zinc-200">{unsuspendTarget.email}</span> akan
              dicabut. Akunnya kembali aktif penuh dan hitungan 3 hari menuju penghapusan dibatalkan.
            </>
          }
          confirmLabel="Ya, Batalkan Suspend"
          busy={unsuspending}
          onCancel={() => setUnsuspendTarget(null)}
          onConfirm={doUnsuspend}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus user ini?"
          description={
            <>
              User <span className="font-medium text-zinc-200">{deleteTarget.email}</span> akan dihapus
              permanen. Semua key miliknya ikut terhapus dan langsung berhenti bekerja.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doDeleteUser}
        />
      )}
    </div>
  );
}
