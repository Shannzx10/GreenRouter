import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Ban } from "lucide-react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { suspendDeadline } from "@/lib/suspension";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  title: "Akun Disuspend · GreenRouter",
};

// Halaman ini membaca sesi + data akun saat request, jangan diprarender.
export const instant = false;

function fmtDate(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sisaWaktu(deadline: Date) {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "kurang dari satu jam";
  const jam = Math.floor(ms / 3600000);
  const hari = Math.floor(jam / 24);
  if (hari >= 1) return `${hari} hari ${jam % 24} jam`;
  if (jam >= 1) return `${jam} jam`;
  return "kurang dari satu jam";
}

// Halaman kunci untuk akun tersuspend: satu-satunya halaman (selain landing)
// yang boleh dibuka selama masa suspend. Layout /app dan /admin mengarahkan
// user tersuspend ke sini.
export default async function SuspendedPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.suspended) redirect(session.role === "ADMIN" ? "/admin" : "/app");

  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { email: true, suspendedAt: true, suspendReason: true },
  });
  if (!user || !user.suspendedAt) redirect("/app");
  const deadline = suspendDeadline(user.suspendedAt);

  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-[#060806] text-zinc-100">
      <div className="bg-dots absolute inset-0" />
      <div className="aurora left-[-120px] top-[-80px] h-96 w-96 bg-red-500/15" />
      <div className="aurora bottom-[-100px] right-[-80px] h-96 w-96 bg-amber-500/10" style={{ animationDelay: "-6s" }} />

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-500/10 text-red-300 ring-1 ring-red-400/25">
          <Ban size={30} />
        </span>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Akunmu Disuspend
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
          Akses {user.email} ke dashboard dan API GreenRouter dihentikan sementara oleh
          admin. Selama masa suspend, kamu hanya bisa membuka halaman ini dan halaman utama.
        </p>

        <div className="glass mx-auto mt-8 w-full max-w-md rounded-3xl p-5 text-left">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-zinc-500">Disuspend sejak</span>
            <span className="text-right font-medium">{fmtDate(user.suspendedAt)}</span>
          </div>
          {user.suspendReason && (
            <div className="mt-3 flex justify-between gap-4 border-t border-white/[0.06] pt-3 text-sm">
              <span className="text-zinc-500">Alasan</span>
              <span className="text-right font-medium">{user.suspendReason}</span>
            </div>
          )}
          <div className="mt-3 border-t border-white/[0.06] pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Batas pembatalan</span>
              <span className="text-right font-medium text-red-300">{fmtDate(deadline)}</span>
            </div>
            <p className="mt-2.5 leading-relaxed text-zinc-400">
              Bila admin tidak membatalkan suspend ini sampai batas waktu di atas
              (tersisa {sisaWaktu(deadline)}), akunmu akan <span className="font-medium text-zinc-200">dihapus
              permanen</span> dan email ini tidak bisa dipakai mendaftar lagi.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-zinc-500">
          Merasa ini kekeliruan? Hubungi admin GreenRouter untuk meninjau suspend ini
          sebelum batas waktunya lewat.
        </p>

        <div className="mt-8">
          <LogoutButton />
        </div>
        <p className="mt-14 text-[11px] font-bold uppercase tracking-[0.42em] text-zinc-500">
          Work Fast · Work Smart
        </p>
      </div>
    </main>
  );
}
