import { connection } from "next/server";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import SmoothAnchors from "../../SmoothAnchors";
import ProviderIcon from "../../ProviderIcon";
import CodeBlock from "./CodeBlock";
import ExampleTabs from "./ExampleTabs";
import ToolGrid from "./ToolGrid";

const BASE = "https://www.greenrouter.eu.cc";

const NAV = [
  { id: "mulai-cepat", label: "Mulai Cepat" },
  { id: "autentikasi", label: "Autentikasi" },
  { id: "endpoint", label: "Endpoint" },
  { id: "contoh-kode", label: "Contoh Kode" },
  { id: "hubungkan-alat", label: "Hubungkan Alat" },
  { id: "model", label: "Model" },
  { id: "streaming", label: "Streaming" },
  { id: "kuota", label: "Kuota" },
  { id: "error", label: "Error" },
  { id: "faq", label: "FAQ" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-36 lg:scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-5 text-[15px] leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}

function fmtTokens(n: number | null): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const thCls = "px-4 py-3 text-left font-medium";
const tdCls = "px-4 py-3 align-top";
const inlineLink = "font-medium text-lime-300 underline decoration-lime-300/40 underline-offset-2 transition hover:text-lime-200";

export default async function AppDocsPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const models = await prisma.modelCatalog.findMany({ orderBy: { displayName: "asc" } });

  return (
    <div>
      <SmoothAnchors />
      <h1 className="text-2xl font-bold">Dokumentasi</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Panduan memakai GreenRouter, satu API key untuk semua model dengan API yang kompatibel
        dengan OpenAI dan Anthropic. Cukup ganti base URL dan key pada SDK atau tool yang sudah
        kamu kenal.
      </p>

      {/* Navigasi section, lengket mengikuti scroll */}
      <nav className="glass sticky top-[68px] z-30 mt-6 flex gap-1.5 overflow-x-auto rounded-full p-1.5 lg:top-6">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] text-zinc-300 transition hover:bg-lime-400/10 hover:text-lime-200"
          >
            {n.label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-14">
        <Section id="mulai-cepat" title="Mulai Cepat">
          <ol className="list-decimal space-y-2.5 pl-5">
            <li>
              <span className="font-medium text-zinc-100">Buat key.</span> Buat API key di halaman{" "}
              <Link href="/app/keys" className={inlineLink}>
                Key &amp; Panduan
              </Link>
              . Key hanya tampil sekali saat dibuat, simpan baik-baik.
            </li>
            <li>
              <span className="font-medium text-zinc-100">Arahkan client ke GreenRouter.</span>{" "}
              Untuk SDK OpenAI pakai base URL{" "}
              <code className="font-mono text-[13px] text-lime-200">{BASE}/v1</code>, untuk SDK
              Anthropic pakai <code className="font-mono text-[13px] text-lime-200">{BASE}</code>{" "}
              (SDK menambahkan <code className="font-mono text-[13px]">/v1/messages</code>{" "}
              sendiri).
            </li>
            <li>
              <span className="font-medium text-zinc-100">Kirim request pertamamu.</span> Pilih
              model dari{" "}
              <Link href="/app/models" className={inlineLink}>
                Katalog Model
              </Link>
              , lalu panggil seperti biasa.
            </li>
          </ol>
          <CodeBlock
            title="curl · request pertama"
            code={`curl ${BASE}/v1/chat/completions \\
  -H "Authorization: Bearer gr-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-v4.1-flash",
    "messages": [{"role": "user", "content": "Halo!"}]
  }'`}
          />
          <p>Responsnya berformat OpenAI standar, lengkap dengan ringkasan pemakaian token:</p>
          <CodeBlock
            title="respons · contoh"
            code={`{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "deepseek-v4.1-flash",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "Halo! Ada yang bisa saya bantu?"},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 12, "completion_tokens": 9, "total_tokens": 21}
}`}
          />
        </Section>

        <Section id="autentikasi" title="Autentikasi">
          <p>
            Setiap request wajib membawa API key milikmu. Ada dua cara yang diterima, pakai salah
            satu:
          </p>
          <div className="overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className={thCls}>Cara</th>
                  <th className={thCls}>Format</th>
                  <th className={thCls}>Dipakai oleh</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/[0.05]">
                  <td className={tdCls}>Bearer token</td>
                  <td className={tdCls}>
                    <code className="font-mono text-[13px] text-lime-200">
                      Authorization: Bearer gr-...
                    </code>
                  </td>
                  <td className={tdCls}>SDK OpenAI, curl, sebagian besar tool</td>
                </tr>
                <tr className="border-t border-white/[0.05]">
                  <td className={tdCls}>Header Anthropic</td>
                  <td className={tdCls}>
                    <code className="font-mono text-[13px] text-lime-200">x-api-key: gr-...</code>
                  </td>
                  <td className={tdCls}>SDK Anthropic dan Claude Code</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass rounded-3xl p-5">
              <p className="text-sm font-semibold text-zinc-100">Base URL OpenAI</p>
              <code className="mt-2 block break-all font-mono text-[13px] text-lime-200">
                {BASE}/v1
              </code>
              <p className="mt-2 text-sm text-zinc-400">
                Untuk SDK OpenAI dan semua client yang kompatibel dengannya.
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="text-sm font-semibold text-zinc-100">Base URL Anthropic</p>
              <code className="mt-2 block break-all font-mono text-[13px] text-lime-200">
                {BASE}
              </code>
              <p className="mt-2 text-sm text-zinc-400">
                Untuk SDK Anthropic dan Claude Code, tanpa akhiran /v1.
              </p>
            </div>
          </div>
          <p>
            Key diawali <code className="font-mono text-[13px] text-lime-200">gr-</code> dan
            terikat ke akunmu. Jangan bagikan key ke siapa pun. Bila merasa key sudah bocor,
            rotate atau cabut key itu dari dashboard, nilai lamanya langsung berhenti bekerja.
          </p>
        </Section>

        <Section id="endpoint" title="Endpoint">
          <p>Tiga endpoint utama, semuanya di bawah base URL yang sama:</p>
          <div className="overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className={thCls}>Method</th>
                  <th className={thCls}>Path</th>
                  <th className={thCls}>Fungsi</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/[0.05]">
                  <td className={tdCls}>
                    <span className="rounded-md bg-sky-400/10 px-2 py-0.5 font-mono text-xs text-sky-300">GET</span>
                  </td>
                  <td className={tdCls}>
                    <code className="font-mono text-[13px]">/v1/models</code>
                  </td>
                  <td className={tdCls}>Daftar model yang bisa dipakai key kamu</td>
                </tr>
                <tr className="border-t border-white/[0.05]">
                  <td className={tdCls}>
                    <span className="rounded-md bg-lime-400/10 px-2 py-0.5 font-mono text-xs text-lime-300">POST</span>
                  </td>
                  <td className={tdCls}>
                    <code className="font-mono text-[13px]">/v1/chat/completions</code>
                  </td>
                  <td className={tdCls}>Chat dengan format OpenAI Chat Completions</td>
                </tr>
                <tr className="border-t border-white/[0.05]">
                  <td className={tdCls}>
                    <span className="rounded-md bg-lime-400/10 px-2 py-0.5 font-mono text-xs text-lime-300">POST</span>
                  </td>
                  <td className={tdCls}>
                    <code className="font-mono text-[13px]">/v1/messages</code>
                  </td>
                  <td className={tdCls}>Chat dengan format Anthropic Messages</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="pt-2 text-lg font-semibold text-zinc-100">POST /v1/chat/completions</h3>
          <p>Mengikuti format OpenAI. Parameter yang umum dipakai:</p>
          <div className="overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className={thCls}>Parameter</th>
                  <th className={thCls}>Wajib</th>
                  <th className={thCls}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["model", "Ya", "ID model persis seperti di katalog, misalnya deepseek-v4.1-flash"],
                  ["messages", "Ya", "Daftar pesan berisi role (system, user, assistant) dan content"],
                  ["stream", "Tidak", "true untuk menerima jawaban sebagai stream SSE"],
                  ["temperature", "Tidak", "Kreativitas jawaban, umumnya 0 sampai 2"],
                  ["max_tokens", "Tidak", "Batas token untuk jawaban yang dihasilkan"],
                  ["tools", "Tidak", "Definisi function calling, untuk model yang mendukung Tool Calling"],
                ].map(([p, w, k]) => (
                  <tr key={p} className="border-t border-white/[0.05]">
                    <td className={tdCls}>
                      <code className="font-mono text-[13px] text-lime-200">{p}</code>
                    </td>
                    <td className={tdCls}>{w}</td>
                    <td className={tdCls}>{k}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="pt-2 text-lg font-semibold text-zinc-100">POST /v1/messages</h3>
          <p>
            Mengikuti format Anthropic Messages. Wajib menyertakan{" "}
            <code className="font-mono text-[13px] text-lime-200">model</code>,{" "}
            <code className="font-mono text-[13px] text-lime-200">max_tokens</code>, dan{" "}
            <code className="font-mono text-[13px] text-lime-200">messages</code>. Header{" "}
            <code className="font-mono text-[13px] text-lime-200">anthropic-version</code> diatur
            otomatis oleh SDK Anthropic. Prompt sistem dikirim lewat field{" "}
            <code className="font-mono text-[13px] text-lime-200">system</code> terpisah, bukan
            sebagai pesan.
          </p>

          <h3 className="pt-2 text-lg font-semibold text-zinc-100">GET /v1/models</h3>
          <p>
            Mengembalikan daftar model aktif beserta metadatanya, antara lain konteks maksimum
            dan kemampuan tiap model. Selalu gunakan ID persis seperti yang dikembalikan endpoint
            ini.
          </p>
          <CodeBlock
            title="curl · daftar model"
            code={`curl ${BASE}/v1/models \\
  -H "Authorization: Bearer gr-..."`}
          />
        </Section>

        <Section id="contoh-kode" title="Contoh Kode">
          <p>Request yang sama dalam tiga SDK populer, pilih tab sesuai bahasamu:</p>
          <ExampleTabs
            examples={[
              {
                id: "python-openai",
                label: "Python · OpenAI",
                title: "python · sdk openai",
                code: `from openai import OpenAI

client = OpenAI(
    base_url="${BASE}/v1",
    api_key="gr-...",
)

res = client.chat.completions.create(
    model="deepseek-v4.1-flash",
    messages=[{"role": "user", "content": "Halo, apa kabar?"}],
)
print(res.choices[0].message.content)`,
              },
              {
                id: "python-anthropic",
                label: "Python · Anthropic",
                title: "python · sdk anthropic",
                code: `from anthropic import Anthropic

client = Anthropic(
    base_url="${BASE}",
    api_key="gr-...",
)

msg = client.messages.create(
    model="deepseek-v4.1-flash",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Halo, apa kabar?"}],
)
print(msg.content[0].text)`,
              },
              {
                id: "node-openai",
                label: "Node.js",
                title: "node.js · sdk openai",
                code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE}/v1",
  apiKey: "gr-...",
});

const res = await client.chat.completions.create({
  model: "deepseek-v4.1-flash",
  messages: [{ role: "user", content: "Halo, apa kabar?" }],
});
console.log(res.choices[0].message.content);`,
              },
            ]}
          />
        </Section>

        <Section id="hubungkan-alat" title="Hubungkan Alat">
          <ToolGrid />
        </Section>

        <Section id="model" title="Model">
          <p>
            Katalog model yang aktif saat ini, terhubung langsung ke katalog GreenRouter jadi
            selalu mengikuti daftar terbaru. Detail kemampuan tiap model, seperti Vision dan Tool
            Calling, ada di halaman{" "}
            <Link href="/app/models" className={inlineLink}>
              Katalog Model
            </Link>
            .
          </p>
          <div className="overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className={thCls}>Model</th>
                  <th className={thCls}>ID Model</th>
                  <th className={thCls}>Konteks</th>
                  <th className={thCls}>Output Maks</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-t border-white/[0.05]">
                    <td className={tdCls}>
                      <span className="flex items-center gap-2.5 font-medium text-zinc-100">
                        <ProviderIcon modelId={m.modelId} className="h-7 w-7" />
                        {m.displayName}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <code className="break-all font-mono text-xs text-lime-200/90">
                        {m.modelId}
                      </code>
                    </td>
                    <td className={tdCls}>{fmtTokens(m.contextTokens)}</td>
                    <td className={tdCls}>{fmtTokens(m.maxOutputTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Daftar yang sama bisa diambil lewat{" "}
            <code className="font-mono text-[13px] text-lime-200">GET /v1/models</code>.
          </p>
        </Section>

        <Section id="streaming" title="Streaming">
          <p>
            Kedua endpoint chat mendukung streaming lewat Server-Sent Events. Tambahkan{" "}
            <code className="font-mono text-[13px] text-lime-200">"stream": true</code> pada
            request, dan jawaban akan tiba potongan demi potongan sampai penanda selesai (pada
            format OpenAI penandanya <code className="font-mono text-[13px]">[DONE]</code>).
          </p>
          <CodeBlock
            title="python · streaming"
            code={`stream = client.chat.completions.create(
    model="deepseek-v4.1-flash",
    messages=[{"role": "user", "content": "Ceritakan tentang Jakarta"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="")`}
          />
          <p>
            Untuk format OpenAI, ringkasan pemakaian token pada stream dikirim di potongan
            terakhir bila kamu menyertakan{" "}
            <code className="font-mono text-[13px] text-lime-200">
              "stream_options": {"{"}"include_usage": true{"}"}
            </code>
            . GreenRouter menambahkan opsi ini secara otomatis, jadi pemakaianmu selalu tercatat
            utuh di halaman{" "}
            <Link href="/app/logs" className={inlineLink}>
              Log
            </Link>
            .
          </p>
        </Section>

        <Section id="kuota" title="Kuota">
          <p>
            Setiap akun mendapat kuota{" "}
            <span className="font-semibold text-zinc-100">5.000.000 token per siklus 7 hari</span>.
            Siklus berjalan sejak tanggal pendaftaran akunmu dan terisi penuh lagi secara otomatis
            setiap 7 hari, tanpa perlu menunggu awal bulan.
          </p>
          <p>
            Selain kuota token, akunmu juga dibatasi{" "}
            <span className="font-semibold text-zinc-100">100 request per jam</span>. Batas ini
            dihitung dengan jendela bergeser 60 menit, jadi kapasitasmu pulih bertahap mengikuti
            keluarnya request lama dari jendela, bukan menunggu jam berikutnya.
          </p>
          <p>
            Pemakaian dihitung dari total token setiap request (prompt ditambah completion) dan
            bisa dipantau kapan saja di halaman{" "}
            <Link href="/app/profile" className={inlineLink}>
              Profil
            </Link>{" "}
            dan{" "}
            <Link href="/app/logs" className={inlineLink}>
              Log Pemakaian
            </Link>
            . Bila kuota habis, request berikutnya ditolak dengan status 429 sampai siklus
            berganti, dan pesan errornya menyebutkan tanggal kuotamu diperbarui. Bila batas
            request per jam yang tercapai, jawabannya juga 429 dengan kode{" "}
            <code className="font-mono text-[13px]">hourly_limit_exceeded</code> dan header{" "}
            <code className="font-mono text-[13px]">Retry-After</code> berisi detik yang perlu
            ditunggu sebelum mencoba lagi.
          </p>
        </Section>

        <Section id="error" title="Error">
          <p>
            Error dikembalikan dengan status HTTP yang stabil dan pesan yang bisa dibaca mesin.
            Format amplopnya mengikuti endpoint yang kamu pakai: gaya OpenAI untuk{" "}
            <code className="font-mono text-[13px]">/v1/chat/completions</code>, gaya Anthropic
            untuk <code className="font-mono text-[13px]">/v1/messages</code>.
          </p>
          <div className="overflow-x-auto glass rounded-3xl">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/[0.04] text-zinc-400">
                <tr>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Arti</th>
                  <th className={thCls}>Yang perlu dilakukan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["400", "Request tidak valid, misalnya field wajib kurang", "Periksa isi request kamu"],
                  ["401", "API key tidak ada, salah, atau sudah dicabut", "Periksa key, buat baru bila perlu"],
                  ["404", "Model tidak ditemukan", "Pakai ID persis dari GET /v1/models"],
                  ["429", "Kuota token siklus ini habis", "Tunggu siklus berikutnya, tanggalnya ada di pesan error"],
                  ["429", "Batas request per jam tercapai", "Tunggu sejumlah detik pada header Retry-After"],
                  ["5xx", "Gangguan sementara di sisi server", "Coba lagi setelah beberapa saat"],
                ].map(([s, a, t]) => (
                  <tr key={s} className="border-t border-white/[0.05]">
                    <td className={tdCls}>
                      <code className="font-mono text-[13px] text-lime-200">{s}</code>
                    </td>
                    <td className={tdCls}>{a}</td>
                    <td className={tdCls}>{t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CodeBlock
            title="contoh · kuota habis (format OpenAI)"
            code={`{
  "error": {
    "message": "Kuota token siklus ini sudah habis. Kuota diperbarui otomatis pada tanggal reset siklusmu.",
    "type": "rate_limit_error",
    "code": "quota_exceeded"
  }
}`}
          />
          <CodeBlock
            title="contoh · key salah (format Anthropic)"
            code={`{
  "type": "error",
  "error": {
    "type": "authentication_error",
    "message": "API key tidak valid."
  }
}`}
          />
        </Section>

        <Section id="faq" title="FAQ">
          <div className="space-y-4">
            <div className="glass rounded-3xl p-5">
              <p className="font-semibold text-zinc-100">Bisakah ganti model di tengah pemakaian?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Bisa. Model ditentukan per request lewat field model, jadi kamu bebas memakai model
                yang berbeda pada request berikutnya, bahkan di sesi dan tool yang sama, tanpa
                mengubah key atau base URL.
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="font-semibold text-zinc-100">Model mana yang bisa membaca gambar?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Model dengan kemampuan Vision di katalog, kirim konten gambar mengikuti format
                pesan OpenAI atau Anthropic yang kamu pakai. Cek kolom kemampuannya di halaman{" "}
                <Link href="/app/models" className={inlineLink}>
                  Katalog Model
                </Link>
                .
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="font-semibold text-zinc-100">Apa saja yang tercatat dari request saya?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Hanya metadata pemakaian: model yang dipakai, jumlah token, waktu respons, dan
                status berhasil atau error. Isi percakapanmu tidak disimpan, dan catatan
                pemakaianmu hanya bisa dilihat olehmu di halaman{" "}
                <Link href="/app/logs" className={inlineLink}>
                  Log
                </Link>
                .
              </p>
            </div>
            <div className="glass rounded-3xl p-5">
              <p className="font-semibold text-zinc-100">Key saya bocor, apa yang harus dilakukan?</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                Segera rotate key itu di halaman{" "}
                <Link href="/app/keys" className={inlineLink}>
                  Key &amp; Panduan
                </Link>
                , nilai rahasianya diganti baru dan nilai lama langsung berhenti bekerja, tanpa
                perlu menghapus dan membuat key dari awal. Setelah itu perbarui key di semua tool
                yang memakainya.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
