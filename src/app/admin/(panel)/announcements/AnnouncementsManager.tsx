"use client";

import { useState } from "react";
import { Megaphone, Pencil, Trash2, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import Reveal from "@/app/Reveal";
import { PANEL } from "@/app/app/ui";

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";

export default function AnnouncementsManager({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = useState<Announcement[]>(initial);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = editingId
        ? await fetch(`/api/admin/announcements/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body }),
          })
        : await fetch("/api/admin/announcements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      if (editingId) {
        setItems((prev) => prev.map((a) => (a.id === editingId ? data.announcement : a)));
        setEditingId(null);
      } else {
        setItems((prev) => [data.announcement, ...prev]);
      }
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a: Announcement) {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setBody("");
    setError(null);
  }

  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function doRemove() {
    if (!deleteTarget) return;
    const a = deleteTarget;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      if (editingId === a.id) cancelEdit();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal menghapus");
    }
  }

  return (
    <div className="mt-8">
      <Reveal>
        <form onSubmit={submit} className={`${PANEL} p-5 sm:p-6 ${editingId ? "border-lime-300/30" : ""}`}>
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Megaphone size={19} />
            </span>
            <p className="font-semibold sm:text-lg">
              {editingId ? "Ubah Pengumuman" : "Pengumuman Baru"}
            </p>
          </div>
          <label className="mt-5 block">
            <span className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
              Judul <span className="tabular-nums">{title.length}/120</span>
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul, misalnya: Model baru telah tiba"
              className={inputCls}
              maxLength={120}
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
              Isi <span className="tabular-nums">{body.length}/1000</span>
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Isi pengumuman, singkat dan jelas."
              rows={3}
              className={`${inputCls} resize-none`}
              maxLength={1000}
            />
          </label>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-shine rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              {busy ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Terbitkan"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-5 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.04]"
              >
                <X size={15} /> Batal
              </button>
            )}
          </div>
        </form>
      </Reveal>

      <div className="mt-6 flex flex-col gap-3">
        {items.length === 0 && (
          <p className={`${PANEL} px-5 py-10 text-center text-sm text-zinc-500`}>
            Belum ada pengumuman. Pengumuman pertama yang kamu terbitkan akan tampil di
            dashboard semua user.
          </p>
        )}
        {items.map((a, i) => (
          <Reveal key={a.id} delay={i * 90}>
            <article className={`${PANEL} group p-5 transition duration-300 hover:border-lime-300/25 sm:p-6 ${editingId === a.id ? "border-lime-300/40" : ""}`}>
              <div className="flex items-start gap-3 sm:gap-4">
                <span className="hidden h-11 w-11 shrink-0 items-center sm:flex justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
                  <Megaphone size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime-300">
                    Pengumuman
                    <span className="ml-2 font-medium normal-case tracking-normal text-zinc-500">
                      {new Date(a.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                  <h3 className="mt-1 font-semibold sm:text-lg">{a.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-400">
                    {a.body}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => startEdit(a)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-300 transition hover:text-lime-200"
                    aria-label={`Ubah pengumuman ${a.title}`}
                    title="Ubah"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(a)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-zinc-300 transition hover:text-red-300"
                    aria-label={`Hapus pengumuman ${a.title}`}
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmModal
          icon={Trash2}
          tone="danger"
          title="Hapus pengumuman ini?"
          description={
            <>
              Pengumuman <span className="font-medium text-zinc-200">{deleteTarget.title}</span> akan
              dihapus permanen dan langsung hilang dari dashboard semua user.
            </>
          }
          confirmLabel="Ya, Hapus"
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={doRemove}
        />
      )}
    </div>
  );
}
