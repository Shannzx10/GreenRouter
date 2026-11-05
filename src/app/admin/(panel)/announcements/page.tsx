import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { PageHeader } from "../../../app/ui";
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
      <PageHeader eyebrow="Panel Admin" title="Pengumuman">
        <p>Pengumuman tampil di dashboard semua user, yang terbaru paling atas.</p>
      </PageHeader>
      <AnnouncementsManager initial={announcements} />
    </div>
  );
}
