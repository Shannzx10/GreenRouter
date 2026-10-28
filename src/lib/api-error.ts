import { Prisma } from "@/generated/prisma/client";

// Petakan error Prisma yang umum ke respons JSON yang ramah, supaya dashboard
// tidak pernah menampilkan "Gagal (500)" untuk kesalahan data yang wajar.
export function prismaErrorResponse(e: unknown): Response | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return Response.json(
        { error: "Data yang sama sudah ada (duplikat)" },
        { status: 409 },
      );
    }
    if (e.code === "P2025") {
      return Response.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (e.code === "P2003") {
      return Response.json(
        { error: "Referensi data tidak valid" },
        { status: 400 },
      );
    }
  }
  return null;
}
