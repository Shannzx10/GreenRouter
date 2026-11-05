import { anthropicError, authenticateClient, getCandidates } from "@/server/gateway";

// POST /v1/messages/count_tokens — perkiraan jumlah token masukan untuk
// sebuah request /v1/messages, mengikuti bentuk endpoint Anthropic
// sungguhan (dipakai Claude Code dan Anthropic SDK untuk mengukur
// konteks sebelum mengirim).
//
// Jumlahnya dihitung LOKAL dari isi request, tanpa memanggil hulu:
// tidak ada tokenizer persis model di server, jadi dipakai pendekatan
// ±4 karakter per token untuk teks (Latin, Indonesia, maupun kode),
// ditambah overhead tetap per pesan dan per gambar. Karena itu hasil
// endpoint ini perkiraan, sama sifatnya dengan endpoint aslinya.
//
// Endpoint ini BUKAN request penyelesaian: tidak memotong kuota token,
// tidak dihitung ke batas request per jam, dan tidak menulis UsageLog.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Kumpulkan semua teks dari struktur konten Anthropic (string polos,
// blok text, hasil tool, dan panggilan tool) untuk dihitung panjangnya.
function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractText).join("\n");
  if (isRecord(value)) {
    if (value.type === "text" && typeof value.text === "string") return value.text;
    if (value.type === "tool_result") return extractText(value.content);
    if (value.type === "tool_use") {
      const name = typeof value.name === "string" ? value.name : "";
      return `${name} ${JSON.stringify(value.input ?? {})}`;
    }
  }
  return "";
}

function countImages(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((n, v) => n + countImages(v), 0);
  if (isRecord(value)) {
    const self = value.type === "image" ? 1 : 0;
    return self + Object.values(value).reduce<number>((n, v) => n + countImages(v), 0);
  }
  return 0;
}

const estimateText = (text: string) => Math.ceil(text.length / 4);

export async function POST(req: Request) {
  const client = await authenticateClient(req);
  if (client === "SUSPENDED") {
    return anthropicError(403, "Akun pemilik key ini sedang disuspend. Semua akses API dihentikan sementara.", "permission_error");
  }
  if (!client) {
    return anthropicError(401, "API key tidak valid", "authentication_error");
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return anthropicError(400, "Body harus berupa JSON yang valid");
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!model) return anthropicError(400, "Field 'model' wajib diisi");
  if (!Array.isArray(body.messages)) {
    return anthropicError(400, "Field 'messages' wajib berupa array");
  }

  const { catalog } = await getCandidates(model);
  if (!catalog) {
    return anthropicError(404, `Model '${model}' tidak ditemukan`, "not_found_error");
  }
  // Akses awal: plan Gratis menerima jawaban yang sama seperti model
  // yang tidak dikenal, sama seperti jalur /v1/messages.
  if (
    catalog.earlyAccessUntil &&
    catalog.earlyAccessUntil > new Date() &&
    (client.user?.plan ?? "gratis") === "gratis"
  ) {
    return anthropicError(404, `Model '${model}' tidak ditemukan`, "not_found_error");
  }

  let tokens = 0;
  tokens += estimateText(extractText(body.system));
  for (const message of body.messages) {
    // Overhead struktur per pesan (peran dan pembungkus blok).
    tokens += 6;
    tokens += estimateText(extractText(isRecord(message) ? message.content : undefined));
    tokens += countImages(message) * 1000;
  }
  if (Array.isArray(body.tools)) {
    tokens += estimateText(JSON.stringify(body.tools));
  }

  return Response.json({ input_tokens: Math.max(1, tokens) });
}
