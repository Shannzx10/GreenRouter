"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, Loader2, User, X } from "lucide-react";
import ConfirmModal from "@/app/ConfirmModal";
import { Card } from "../ui";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15";
const btnCls =
  "btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 disabled:opacity-50";

function PwField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-4">
      <label htmlFor={id} className="mb-1.5 block text-sm text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={`${inputCls} pr-11`}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

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

  // Kabar dari alur hubungkan akun OAuth (?linked= / ?error= di URL),
  // dibaca langsung dari parameter URL sebagai nilai awal state.
  const searchParams = useSearchParams();
  const linked = searchParams.get("linked");
  const urlError = searchParams.get("error");
  const [notice, setNotice] = useState(() =>
    linked
      ? `Akun ${linked === "google" ? "Google" : linked === "github" ? "GitHub" : linked} berhasil dihubungkan. Sekarang kamu bisa masuk dengan metode itu juga.`
      : (urlError ?? ""),
  );
  const [noticeErr] = useState(() => !linked && !!urlError);

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
      <div aria-live="polite">
        {notice && (
          <p
            role={noticeErr ? "alert" : "status"}
            className={`mt-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
              noticeErr
                ? "border-red-400/25 bg-red-500/10 text-red-300"
                : "border-lime-300/25 bg-lime-400/[0.07] text-lime-200"
            }`}
          >
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Tutup pesan" className="shrink-0 opacity-70 hover:opacity-100">
              <X size={15} />
            </button>
          </p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={saveName}>
          <Card icon={User} title="Data Diri" className="h-full">
            <label htmlFor="profile-name" className="mb-1.5 mt-5 block text-sm text-zinc-300">Nama</label>
            <input id="profile-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" autoComplete="name" />
            {nameMsg && (
              <p role="status" className={`mt-3 text-sm ${nameMsg === "Nama tersimpan." ? "text-lime-300" : "text-red-300"}`}>{nameMsg}</p>
            )}
            <button type="submit" disabled={nameBusy} className={`${btnCls} mt-5`}>
              {nameBusy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} Simpan
            </button>
          </Card>
        </form>

        <form onSubmit={requestPasswordChange}>
          <Card icon={KeyRound} title={hasPassword ? "Ganti Password" : "Setel Password"} className="h-full">
            {!hasPassword && (
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Akunmu lahir dari login Google/GitHub. Setel password di sini bila ingin bisa
                masuk juga pakai email+password.
              </p>
            )}
            {hasPassword && (
              <PwField id="pw-current" label="Password saat ini" value={current} onChange={setCurrent} autoComplete="current-password" />
            )}
            <PwField id="pw-new" label="Password baru (min. 8 karakter)" value={next} onChange={setNext} autoComplete="new-password" minLength={8} />
            <PwField id="pw-confirm" label="Konfirmasi password baru" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            {pwMsg && (
              <p role={pwErr ? "alert" : "status"} className={`mt-3 text-sm ${pwErr ? "text-red-300" : "text-lime-300"}`}>{pwMsg}</p>
            )}
            <button type="submit" disabled={pwBusy} className={`${btnCls} mt-5`}>
              {pwBusy ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />} {hasPassword ? "Ganti Password" : "Setel Password"}
            </button>
          </Card>
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
