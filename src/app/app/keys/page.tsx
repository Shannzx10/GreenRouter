import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BookOpen, TerminalSquare } from "lucide-react";
import UserKeysManager from "./UserKeysManager";

export default async function UserKeysPage() {
  await connection();
  const session = await getSession();
  if (!session) return null;
  const keys = await prisma.apiKey.findMany({
    where: { userId: session.uid },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, prefix: true, isActive: true, lastUsedAt: true, createdAt: true },
  });
  const data = keys.map((k) => ({
    ...k,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));
  return (
    <>
      <UserKeysManager keys={data} />

      <h2 className="mt-12 flex items-center gap-2 text-lg font-semibold">
        <BookOpen size={19} className="text-lime-300" /> Cara Pakai
      </h2>
      <div className="glass mt-3 rounded-3xl p-5">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-zinc-300">
          <li>Buat key di halaman ini dan salin nilainya (hanya tampil sekali).</li>
          <li>
            Di tool-mu, arahkan base URL ke{" "}
            <code className="font-mono text-lime-200">https://www.greenrouter.eu.cc/v1</code> dan isi API key
            dengan key <code className="font-mono">gr-…</code> milikmu.
          </li>
          <li>
            Pilih salah satu model dari halaman Model. Selesai, riwayat dan tokenmu tercatat di
            halaman Log.
          </li>
        </ol>
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold">
        <TerminalSquare size={19} className="text-lime-300" /> Contoh Konfigurasi OpenCode
      </h2>
      <div className="glass mt-3 rounded-3xl p-1.5">
        <pre className="overflow-x-auto rounded-[20px] bg-black/50 px-5 py-4 font-mono text-[12px] leading-relaxed text-zinc-300">
{`{
  "provider": {
    "greenrouter": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://www.greenrouter.eu.cc/v1",
        "apiKey": "gr-..."
      },
      "models": {
        "deepseek-v4.1-flash": {}
      }
    }
  }
}`}
        </pre>
      </div>

      <h2 className="mt-8 flex items-center gap-2 text-lg font-semibold">
        <TerminalSquare size={19} className="text-lime-300" /> Contoh Claude Code (Anthropic)
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
        GreenRouter juga kompatibel Anthropic, Claude Code dan Anthropic SDK bisa diarahkan ke
        sini memakai key yang sama:
      </p>
      <div className="glass mt-3 rounded-3xl p-1.5">
        <pre className="overflow-x-auto rounded-[20px] bg-black/50 px-5 py-4 font-mono text-[12px] leading-relaxed text-zinc-300">
{`export ANTHROPIC_BASE_URL="https://www.greenrouter.eu.cc"
export ANTHROPIC_API_KEY="gr-..."
export ANTHROPIC_MODEL="deepseek-v4.1-flash"

claude`}
        </pre>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Contoh curl</h2>
      <div className="glass mt-3 rounded-3xl p-1.5">
        <pre className="overflow-x-auto rounded-[20px] bg-black/50 px-5 py-4 font-mono text-[12px] leading-relaxed text-zinc-300">
{`curl https://www.greenrouter.eu.cc/v1/chat/completions \\
  -H "Authorization: Bearer gr-..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"Halo!"}]}'`}
        </pre>
      </div>
    </>
  );
}
