import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CYCLE_DAYS, cycleTokensUsed, fmtDateShort, fmtResetIn, hourlyRequestsUsed } from "@/lib/quota";
import { ArrowUpRight, CreditCard, Fingerprint, Gauge } from "lucide-react";
import ProfileForms from "./ProfileForms";
import LogoutSection from "./LogoutSection";
import PortalButton from "./PortalButton";
import { planById, formatIdNumber } from "@/lib/plans";

export default async function ProfilePage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return null;
  const providers = user.authProviders
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const { used, window } = await cycleTokensUsed(user.id, user.createdAt);
  const limit = user.tokenLimit;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : null;
  const remaining = limit ? Math.max(0, limit - used) : null;
  const hourly = await hourlyRequestsUsed(user.id);
  const hourlyLimit = user.requestLimitHourly;
  const hourlyPct = hourlyLimit
    ? Math.min(100, Math.round((hourly.count / hourlyLimit) * 100))
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold">Profil</h1>
      <p className="mt-1 text-sm text-zinc-400">Data dirimu, kuota token, dan metode masuk.</p>

      <div className="glass mt-6 rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? user.email}
              className="h-14 w-14 rounded-3xl object-cover ring-1 ring-white/15"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-lime-400 text-xl font-extrabold text-zinc-950">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{user.name ?? user.email.split("@")[0]}</p>
            <p className="truncate text-sm text-zinc-400">{user.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-300">
            {user.role}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-zinc-500">Bergabung</p>
            <p className="mt-0.5 font-medium">
              {user.createdAt.toLocaleDateString("id-ID", { dateStyle: "long" })}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Status akun</p>
            <p className="mt-0.5 flex items-center gap-2 font-medium">
              <span className={`h-2 w-2 rounded-full ${user.suspendedAt ? "bg-red-400" : "bg-lime-300"}`} />
              {user.suspendedAt ? "Disuspend" : "Aktif"}
            </p>
          </div>
        </div>
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <Gauge size={18} />
            </span>
            Kuota
          </h2>
          <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-zinc-300">
            Siklus {CYCLE_DAYS} hari
          </span>
        </div>

        {limit ? (
          <>
            <div className="mt-4 flex items-baseline justify-between text-sm">
              <p className="text-zinc-400">
                Terpakai{" "}
                <span className="font-semibold text-zinc-100">{used.toLocaleString("id-ID")}</span>
                <span className="text-zinc-500"> dari {limit.toLocaleString("id-ID")} token</span>
              </p>
              <span className="text-zinc-500">{pct}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${pct! >= 100 ? "bg-red-400" : pct! >= 80 ? "bg-amber-300" : "bg-lime-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-zinc-500">Sisa kuota</p>
                <p className="mt-0.5 font-medium">{remaining!.toLocaleString("id-ID")} token</p>
              </div>
              <div>
                <p className="text-zinc-500">Periode siklus ini</p>
                <p className="mt-0.5 font-medium">
                  {fmtDateShort(window.start)} – {fmtDateShort(window.end)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Kuota diperbarui</p>
                <p className="mt-0.5 font-medium">
                  {fmtDateShort(window.end)} · {fmtResetIn(window.end)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-zinc-400">
              Terpakai siklus ini:{" "}
              <span className="font-semibold text-zinc-100">{used.toLocaleString("id-ID")}</span>{" "}
              token
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">Akunmu tidak dibatasi kuota.</p>
          </>
        )}

        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <p className="text-sm font-medium">Request per Jam</p>
          {hourlyLimit ? (
            <>
              <div className="mt-3 flex items-baseline justify-between text-sm">
                <p className="text-zinc-400">
                  Terpakai{" "}
                  <span className="font-semibold text-zinc-100">{hourly.count.toLocaleString("id-ID")}</span>
                  <span className="text-zinc-500"> dari {hourlyLimit.toLocaleString("id-ID")} request dalam 60 menit terakhir</span>
                </p>
                <span className="text-zinc-500">{hourlyPct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${hourlyPct! >= 100 ? "bg-red-400" : hourlyPct! >= 80 ? "bg-amber-300" : "bg-lime-400"}`}
                  style={{ width: `${hourlyPct}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Dihitung dengan jendela bergeser 60 menit, kapasitas pulih bertahap mengikuti
                keluarnya request lama dari jendela.
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Terpakai 60 menit terakhir:{" "}
              <span className="font-semibold text-zinc-100">{hourly.count.toLocaleString("id-ID")}</span>{" "}
              request, tanpa batas per jam.
            </p>
          )}
        </div>
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
              <CreditCard size={18} />
            </span>
            Plan
          </h2>
          <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
            {planById(user.plan).name}
          </span>
        </div>
        {user.plan === "gratis" ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Kamu memakai plan Gratis dengan {formatIdNumber(planById("gratis").tokenLimit)} token
            per siklus. Plan berbayar menaikkan kuota token menjadi{" "}
            {formatIdNumber(planById("pro").tokenLimit)} (Pro) atau{" "}
            {formatIdNumber(planById("max").tokenLimit)} (Max) per siklus, dengan batas request
            per jam yang lebih longgar.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            {user.paddleCancelAt
              ? `Langgananmu dijadwalkan berakhir pada ${user.paddleCancelAt.toLocaleDateString("id-ID", { dateStyle: "long" })}. Kamu tetap memakai plan ini sampai tanggal itu, sesudahnya akun kembali ke plan Gratis. Batalkan penjadwalan ini kapan saja dari portal pelanggan.`
              : user.paddleSubStatus === "past_due"
                ? "Pembayaran terakhir tertunda. Perbarui metode pembayaranmu dari portal pelanggan agar langganan tidak berhenti."
                : user.paddleSubStatus === "paused"
                  ? "Langgananmu sedang dijeda, kuota mengikuti plan Gratis sampai dilanjutkan."
                  : user.paddleSubStatus === "canceled"
                    ? "Langgananmu sudah berakhir, kuota mengikuti plan Gratis."
                    : "Langgananmu aktif dan diperpanjang otomatis setiap bulan. Ubah metode pembayaran, unduh invoice, atau batalkan dari portal pelanggan."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-start gap-3">
          {user.plan !== "max" && (
            <Link
              href="/pricing"
              className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300"
            >
              Upgrade Plan <ArrowUpRight size={15} />
            </Link>
          )}
          {user.plan !== "gratis" && <PortalButton />}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          {user.plan === "gratis"
            ? "Perbandingan plan dan pembelian ada di halaman harga."
            : "Pembayaran aman melalui Paddle. Langganan diperpanjang otomatis dan dapat dibatalkan kapan saja dari portal pelanggan."}
        </p>
      </div>

      <div className="glass mt-6 rounded-3xl p-6">
        <h2 className="flex items-center gap-3 font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300 ring-1 ring-lime-300/20">
            <Fingerprint size={18} />
          </span>
          Metode Masuk
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          Metode lain dengan email yang sama harus dihubungkan dulu dari sini, tidak otomatis
          digabung.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {(["google", "github"] as const).map((p) => {
            const linked = providers.includes(p);
            return (
              <div
                key={p}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
              >
                <span className="text-sm font-medium">{p === "google" ? "Google" : "GitHub"}</span>
                {linked ? (
                  <span className="rounded-full bg-lime-400/10 px-3 py-1 text-xs font-medium text-lime-300">
                    Terhubung
                  </span>
                ) : (
                  <a
                    href={`/api/auth/${p}?link=1`}
                    className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-lime-300/40 hover:text-lime-200"
                  >
                    Hubungkan
                  </a>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <span className="text-sm font-medium">Email + Password</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                providers.includes("password")
                  ? "bg-lime-400/10 text-lime-300"
                  : "bg-white/[0.06] text-zinc-400"
              }`}
            >
              {providers.includes("password") ? "Terhubung" : "Belum disetel"}
            </span>
          </div>
        </div>
      </div>

      <ProfileForms
        initialName={user.name ?? ""}
        hasPassword={!user.passwordHash.startsWith("oauth:")}
      />

      <LogoutSection />
    </div>
  );
}
