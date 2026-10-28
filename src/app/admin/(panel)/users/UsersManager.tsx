"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  authProviders: string;
  role: string;
  isActive: boolean;
  tokenLimit: number | null;
  requestLimitHourly: number | null;
  keyCount: number;
  usedThisCycle: number;
  createdAt: string;
  isSelf: boolean;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";
const btnCls =
  "inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

function fmtNum(n: number) {
  return n.toLocaleString("id-ID");
}

export default function UsersManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
          Panel Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pengguna</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Kelola akun user yang mendaftar lewat Google/GitHub: data diri, role, status aktif, dan
          limit token per siklus 7 hari. Akun baru hanya lahir dari pendaftaran OAuth, tidak ada pembuatan
          user manual. Menghapus user juga menghapus semua key miliknya.
        </p>
      </Reveal>

      {err && (
        <p className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{err}</p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {users.map((u, ui) => {
          const pct = u.tokenLimit
            ? Math.min(100, Math.round((u.usedThisCycle / u.tokenLimit) * 100))
            : null;
          const isEditing = editing === u.id;
          return (
            <Reveal key={u.id} delay={ui * 80}>
            <div className="glass rounded-3xl p-5 sm:p-6">
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
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {u.name ?? u.email.split("@")[0]}
                    {u.isSelf && <span className="ml-2 text-xs font-normal text-zinc-500">(kamu)</span>}
                  </p>
                  <p className="truncate text-sm text-zinc-400">
                    {u.email} · masuk via{" "}
                    {u.authProviders
                      .split(",")
                      .map((p) => (p === "google" ? "Google" : p === "github" ? "GitHub" : "password"))
                      .join(" + ")}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.role === "ADMIN" ? "bg-lime-400/15 text-lime-200" : "bg-white/[0.06] text-zinc-300"}`}>
                    {u.role}
                  </span>
                  <button
                    disabled={u.isSelf}
                    onClick={async () => {
                      await call(`/api/admin/users/${u.id}`, "PATCH", { isActive: !u.isActive });
                      router.refresh();
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium disabled:opacity-40 ${
                      u.isActive ? "bg-lime-400/10 text-lime-300" : "bg-red-500/15 text-red-300"
                    }`}
                    title={u.isSelf ? "Akun sendiri tidak bisa dinonaktifkan" : "Aktif/nonaktifkan"}
                  >
                    {u.isActive ? "AKTIF" : "NONAKTIF"}
                  </button>
                  <button
                    onClick={() => (isEditing ? setEditing(null) : startEdit(u))}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
                    title="Edit user"
                  >
                    {isEditing ? <X size={16} /> : <Pencil size={16} />}
                  </button>
                  {!u.isSelf && (
                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-red-300"
                      title="Hapus user"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                <span>{u.keyCount} key</span>
                <span>Terpakai siklus ini: <span className="text-zinc-200">{fmtNum(u.usedThisCycle)}</span> token</span>
                <span>
                  Limit:{" "}
                  <span className="text-zinc-200">
                    {u.tokenLimit ? `${fmtNum(u.tokenLimit)} / siklus` : "tanpa batas"}
                  </span>
                </span>
                <span>
                  Request:{" "}
                  <span className="text-zinc-200">
                    {u.requestLimitHourly ? `${fmtNum(u.requestLimitHourly)} / jam` : "tanpa batas"}
                  </span>
                </span>
                <span>Bergabung {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
              </div>
              {pct !== null && (
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : pct >= 80 ? "bg-amber-300" : "bg-lime-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {isEditing && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  <input className={inputCls} placeholder="Nama" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                  <input className={inputCls} type="email" placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  <select className={inputCls} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  <input className={inputCls} type="number" min="0" placeholder="Limit token/siklus 7 hari (kosong = ∞)" value={editForm.limit} onChange={(e) => setEditForm({ ...editForm, limit: e.target.value })} />
                  <input className={inputCls} type="number" min="0" placeholder="Limit request/jam (kosong = ∞)" value={editForm.hourly} onChange={(e) => setEditForm({ ...editForm, hourly: e.target.value })} />
                  <button onClick={() => saveEdit(u)} className={btnCls}>
                    Simpan Perubahan
                  </button>
                </div>
              )}
            </div>
            </Reveal>
          );
        })}
      </div>

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
