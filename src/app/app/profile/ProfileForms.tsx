"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, User } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition focus:border-lime-300/60";
const btnCls =
  "inline-flex items-center gap-2 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

export default function ProfileForms({
  initialName,
  hasPassword: initialHasPassword = true,
}: {
  initialName: string;
  hasPassword?: boolean;
}) {
  const router = useRouter();
  // Status password hidup sebagai state: begitu password pertama berhasil
  // disetel, form langsung berubah jadi mode "Ganti Password" tanpa refresh.
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [name, setName] = useState(initialName);
  const [nameMsg, setNameMsg] = useState("");
  const [nameBusy, setNameBusy] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwConfirmOpen, setPwConfirmOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeErr, setNoticeErr] = useState(false);

  // Kabar dari alur hubungkan akun OAuth (?linked= / ?error= di URL)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const linked = q.get("linked");
    const err = q.get("error");
    if (linked) {
      setNotice(
        `Akun ${linked === "google" ? "Google" : linked === "github" ? "GitHub" : linked} berhasil dihubungkan. Sekarang kamu bisa masuk dengan metode itu juga.`,
      );
    } else if (err) {
      setNoticeErr(true);
      setNotice(err);
    }
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameBusy(true);
    setNameMsg("");
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNameBusy(false);
    if (res.ok) {
      setNameMsg("Nama tersimpan.");
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setNameMsg(d.error ?? "Gagal menyimpan nama");
    }
  }

  // Submit form hanya memvalidasi lalu membuka modal konfirmasi; perubahan
  // password sungguhan berjalan setelah user menekan "Ya" di modal.
  function requestPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    setPwErr(false);
    if (next !== confirm) {
      setPwErr(true);
      setPwMsg("Konfirmasi password baru tidak sama");
      return;
    }
    setPwConfirmOpen(true);
  }

  async function doChangePassword() {
    setPwBusy(true);
    const res = await fetch("/api/user/change-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setPwBusy(false);
    setPwConfirmOpen(false);
    if (res.ok) {
      setPwMsg(
        hasPassword
          ? "Password berhasil diganti."
          : "Password berhasil disetel. Sekarang kamu bisa masuk juga pakai email+password.",
      );
      setHasPassword(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // Segarkan bagian server (badge "Email + Password" di Metode Masuk
      // langsung jadi Terhubung) — user tidak perlu refresh manual.
      router.refresh();
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setPwErr(true);
      setPwMsg(d.error ?? "Gagal mengganti password");
    }
  }

  return (
    <div>
      {notice && (
        <p
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            noticeErr
              ? "border-red-400/25 bg-red-500/10 text-red-300"
              : "border-lime-300/25 bg-lime-400/[0.07] text-lime-200"
          }`}
        >
          {notice}
        </p>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form onSubmit={saveName} className="glass rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <User size={18} className="text-lime-300" /> Data Diri
        </h2>
        <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Nama</label>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" />
        {nameMsg && <p className="mt-3 text-sm text-lime-300">{nameMsg}</p>}
        <button type="submit" disabled={nameBusy} className={`${btnCls} mt-4`}>
          {nameBusy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Simpan
        </button>
      </form>

      <form onSubmit={requestPasswordChange} className="glass rounded-3xl p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound size={18} className="text-lime-300" /> {hasPassword ? "Ganti Password" : "Setel Password"}
        </h2>
        {!hasPassword && (
          <>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Akunmu lahir dari login Google/GitHub. Setel password di sini bila ingin bisa
              masuk juga pakai email+password.
            </p>
            <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Password baru (min. 8 karakter)</label>
            <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
            <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Konfirmasi password baru</label>
            <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {pwMsg && <p className={`mt-3 text-sm ${pwErr ? "text-red-300" : "text-lime-300"}`}>{pwMsg}</p>}
            <button type="submit" disabled={pwBusy} className={`${btnCls} mt-4`}>
              {pwBusy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Setel Password
            </button>
          </>
        )}
        {hasPassword && (
          <>
            <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Password saat ini</label>
            <input className={inputCls} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Password baru (min. 8 karakter)</label>
            <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
            <label className="mb-1.5 mt-4 block text-sm text-zinc-300">Konfirmasi password baru</label>
            <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {pwMsg && <p className={`mt-3 text-sm ${pwErr ? "text-red-300" : "text-lime-300"}`}>{pwMsg}</p>}
            <button type="submit" disabled={pwBusy} className={`${btnCls} mt-4`}>
              {pwBusy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Ganti Password
            </button>
          </>
        )}
      </form>
      </div>

      {pwConfirmOpen && (
        <ConfirmModal
          icon={KeyRound}
          title={hasPassword ? "Ganti password sekarang?" : "Setel password sekarang?"}
          description={
            hasPassword
              ? "Password lamamu langsung tidak berlaku setelah ini. Untuk masuk berikutnya pakai password baru yang barusan kamu buat."
              : "Setelah disetel, kamu bisa masuk juga pakai email+password dengan password yang barusan kamu buat, selain lewat Google/GitHub."
          }
          confirmLabel={hasPassword ? "Ya, Ganti Password" : "Ya, Setel Password"}
          busy={pwBusy}
          onCancel={() => setPwConfirmOpen(false)}
          onConfirm={doChangePassword}
        />
      )}
    </div>
  );
}
