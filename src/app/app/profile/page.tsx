import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { CYCLE_DAYS, cycleTokensUsed, fmtDateShort, fmtResetIn, hourlyRequestsUsed } from "@/lib/quota";
import { ArrowUpRight, CreditCard, Fingerprint, Gauge, Mail } from "lucide-react";
import { Card, PageHeader, PANEL, Pill } from "../ui";
import ProfileForms from "./ProfileForms";
import LogoutSection from "./LogoutSection";
import PortalButton from "./PortalButton";
import { planById } from "@/lib/plans";

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

  const barTone = (p: number) => (p >= 100 ? "bg-red-400" : p >= 80 ? "bg-amber-300" : "bg-lime-400");
  const sub = user.paddleSubStatus;
  const planState =
    user.plan === "gratis"
      ? null
      : user.paddleCancelAt
        ? { label: "Dijadwalkan berakhir", cls: "bg-amber-400/10 text-amber-300" }
        : sub === "past_due"
          ? { label: "Pembayaran tertunda", cls: "bg-red-500/15 text-red-300" }
          : sub === "paused"
            ? { label: "Dijeda", cls: "bg-amber-400/10 text-amber-300" }
            : sub === "canceled"
              ? { label: "Berakhir", cls: "bg-white/[0.06] text-zinc-400" }
              : { label: "Aktif", cls: "bg-lime-400/10 text-lime-300" };
  const displayName = user.name ?? user.email.split("@")[0];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader eyebrow="Akun" title="Profil">
        <p>Data dirimu, kuota token, dan metode masuk.</p>
      </PageHeader>

      {/* Identitas */}
      <section className={`${PANEL} relative mt-6 overflow-hidden p-5 sm:p-6`}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-72 rounded-full bg-lime-400/10 blur-[80px]" />
        <div className="relative flex flex-wrap items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={displayName}
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/15"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400 text-2xl font-extrabold text-zinc-950">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{displayName}</p>
            <p className="truncate text-sm text-zinc-400">{user.email}</p>
          </div>
          <Pill className="bg-white/[0.06] px-3 py-1 font-mono font-medium uppercase tracking-wider text-zinc-300">
            {user.role}
          </Pill>
        </div>
        <dl className="relative mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
            <dt className="text-xs text-zinc-500">Bergabung</dt>
            <dd className="mt-0.5 font-medium">
              {user.createdAt.toLocaleDateString("id-ID", { dateStyle: "long" })}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
            <dt className="text-xs text-zinc-500">Status akun</dt>
            <dd className="mt-0.5 flex items-center gap-2 font-medium">
              <span className={`h-2 w-2 rounded-full ${user.suspendedAt ? "bg-red-400" : "bg-lime-300 shadow-[0_0_8px_rgba(190,242,100,0.8)]"}`} />
              {user.suspendedAt ? "Disuspend" : "Aktif"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Kuota */}
        <Card icon={Gauge} title="Kuota" aside={<Pill className="bg-white/[0.06] px-3 py-1 font-medium text-zinc-300">Siklus {CYCLE_DAYS} hari</Pill>} className="flex flex-col">
          {limit ? (
            <>
              <div className="mt-5 flex items-baseline justify-between gap-3 text-sm">
                <p className="text-zinc-400">
                  Terpakai{" "}
                  <span className="font-semibold text-zinc-100">{used.toLocaleString("id-ID")}</span>
                  <span className="text-zinc-500"> dari {limit.toLocaleString("id-ID")} token</span>
                </p>
                <span className="font-semibold tabular-nums text-zinc-200">{pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className={`h-full rounded-full ${barTone(pct!)}`} style={{ width: `${pct}%` }} />
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-2.5 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-2.5">
                  <dt className="text-zinc-500">Sisa kuota</dt>
                  <dd className="font-medium tabular-nums text-lime-200">{remaining!.toLocaleString("id-ID")} token</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-2.5">
                  <dt className="text-zinc-500">Periode siklus ini</dt>
                  <dd className="text-right font-medium">{fmtDateShort(window.start)} – {fmtDateShort(window.end)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-2.5">
                  <dt className="text-zinc-500">Kuota diperbarui</dt>
                  <dd className="text-right font-medium">{fmtDateShort(window.end)} · {fmtResetIn(window.end)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="mt-5 text-sm text-zinc-400">
                Terpakai siklus ini:{" "}
                <span className="font-semibold text-zinc-100">{used.toLocaleString("id-ID")}</span> token
              </p>
              <p className="mt-1.5 text-xs text-zinc-500">Akunmu tidak dibatasi kuota.</p>
            </>
          )}

          <div className="mt-auto pt-5">
            <div className="border-t border-white/[0.07] pt-4">
              <p className="text-sm font-medium">Request per Jam</p>
              {hourlyLimit ? (
                <>
                  <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
                    <p className="text-zinc-400">
                      Terpakai{" "}
                      <span className="font-semibold text-zinc-100">{hourly.count.toLocaleString("id-ID")}</span>
                      <span className="text-zinc-500"> dari {hourlyLimit.toLocaleString("id-ID")} request dalam 60 menit terakhir</span>
                    </p>
                    <span className="font-semibold tabular-nums text-zinc-200">{hourlyPct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className={`h-full rounded-full ${barTone(hourlyPct!)}`} style={{ width: `${hourlyPct}%` }} />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
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
        </Card>

        {/* Plan */}
        <Card
          icon={CreditCard}
          title="Plan"
          className="flex flex-col"
          aside={
            <span className="flex items-center gap-2">
              {planState && <Pill className={planState.cls}>{planState.label}</Pill>}
              <Pill className="bg-lime-400/10 px-3 py-1 font-semibold text-lime-300">{planById(user.plan).name}</Pill>
            </span>
          }
        >
          {user.plan === "gratis" ? (
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
              Plan berbayar memberikan kuota token dan batas request yang jauh lebih besar.
            </p>
          ) : (
            <p className="mt-5 text-sm leading-relaxed text-zinc-400">
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
          <div className="mt-auto pt-5">
            <div className="flex flex-wrap items-start gap-3">
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
        </Card>
      </div>

      {/* Metode masuk */}
      <Card icon={Fingerprint} title="Metode Masuk" className="mt-4">
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Hubungkan metode masuk lain ke akunmu. Setiap metode harus dihubungkan secara manual
          demi keamanan.
        </p>
        <div className="mt-4 grid gap-2.5 md:grid-cols-3">
          {(["google", "github"] as const).map((p) => {
            const linked = providers.includes(p);
            const label = p === "google" ? "Google" : "GitHub";
            return (
              <div key={p} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-sm font-bold text-zinc-200">
                  {label.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                {linked ? (
                  <Pill className="bg-lime-400/10 px-3 py-1 font-medium text-lime-300">Terhubung</Pill>
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
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300">
              <Mail size={16} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">Email + Password</span>
            <Pill className={`px-3 py-1 font-medium ${providers.includes("password") ? "bg-lime-400/10 text-lime-300" : "bg-white/[0.06] text-zinc-400"}`}>
              {providers.includes("password") ? "Terhubung" : "Belum disetel"}
            </Pill>
          </div>
        </div>
      </Card>

      <ProfileForms
        initialName={user.name ?? ""}
        hasPassword={!user.passwordHash.startsWith("oauth:")}
      />

      <LogoutSection />
    </div>
  );
}
