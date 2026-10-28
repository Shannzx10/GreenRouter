import { connection } from "next/server";
import { prisma } from "@/lib/db";
import Reveal from "../../../Reveal";
import AnnouncementsManager from "./AnnouncementsManager";

export default async function AnnouncementsPage() {
  await connection();
  const rows = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  const announcements = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    createdAt: a.createdAt.toISOString(),
  }));
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-lime-300/80">
          Panel Admin
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pengumuman</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Pengumuman tampil di dashboard semua user, yang terbaru paling atas.
        </p>
      </Reveal>
      <AnnouncementsManager initial={announcements} />
    </div>
  );
}
