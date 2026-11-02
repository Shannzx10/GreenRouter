"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={logout}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-400/30 px-7 py-3.5 font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} />}
      Keluar dari Akun
    </button>
  );
}
