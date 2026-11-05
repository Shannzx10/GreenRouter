/* eslint-disable react/no-unescaped-entities -- Komponen contoh kode:
   tanda kutip di dalam JSX adalah ISI kode contoh yang ditampilkan
   apa adanya, bukan teks prosa. */
"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

// Showcase kode ala panel contoh di landing: tab bahasa (Python / Node.js /
// cURL), pewarnaan sintaks manual, dan tombol salin yang menyalin teks polos.
// Menggantikan demo chat — pengunjung developer lebih terkesan contoh nyata.

const BASE = "https://www.greenrouter.eu.cc/v1";

const PLAIN: Record<string, string> = {
  Python: `from openai import OpenAI

client = OpenAI(
    base_url="${BASE}",
    api_key="gr-key-kamu",
)

response = client.chat.completions.create(
    model="deepseek-v4-flash-0731",
    messages=[{"role": "user", "content": "Halo!"}],
)

print(response.choices[0].message.content)`,
  Anthropic: `import anthropic

client = anthropic.Anthropic(
    base_url="https://www.greenrouter.eu.cc",
    api_key="gr-key-kamu",
)

message = client.messages.create(
    model="deepseek-v4-flash-0731",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Halo!"}],
)

print(message.content[0].text)`,
  "Node.js": `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE}",
  apiKey: "gr-key-kamu",
});

const response = await client.chat.completions.create({
  model: "deepseek-v4-flash-0731",
  messages: [{ role: "user", content: "Halo!" }],
});

console.log(response.choices[0].message.content);`,
  cURL: `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer gr-key-kamu" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-v4-flash-0731",
    "messages": [
      { "role": "user", "content": "Halo!" }
    ]
  }'`,
};

// Token pewarnaan
const kw = "text-fuchsia-300"; // kata kunci
const fn = "text-lime-300"; // fungsi/metode
const st = "text-emerald-300"; // string
const nm = "text-zinc-100"; // nama variabel
const pn = "text-zinc-400"; // tanda baca/redup

function PythonCode() {
  return (
    <code>
      <span className={kw}>from</span> <span className={nm}>openai</span> <span className={kw}>import</span> <span className={fn}>OpenAI</span>
      {"\n\n"}
      <span className={nm}>client</span> <span className={pn}>=</span> <span className={fn}>OpenAI</span>
      <span className={pn}>(</span>
      {"\n    "}
      <span className={nm}>base_url</span>
      <span className={pn}>=</span>
      <span className={st}>"{BASE}"</span>
      <span className={pn}>,</span>
      {"\n    "}
      <span className={nm}>api_key</span>
      <span className={pn}>=</span>
      <span className={st}>"gr-key-kamu"</span>
      <span className={pn}>,</span>
      {"\n"}
      <span className={pn}>)</span>
      {"\n\n"}
      <span className={nm}>response</span> <span className={pn}>=</span> <span className={nm}>client</span>
      <span className={pn}>.</span>
      <span className={nm}>chat</span>
      <span className={pn}>.</span>
      <span className={nm}>completions</span>
      <span className={pn}>.</span>
      <span className={fn}>create</span>
      <span className={pn}>(</span>
      {"\n    "}
      <span className={nm}>model</span>
      <span className={pn}>=</span>
      <span className={st}>"deepseek-v4-flash-0731"</span>
      <span className={pn}>,</span>
      {"\n    "}
      <span className={nm}>messages</span>
      <span className={pn}>=</span>
      <span className={pn}>[{"{"}</span>
      <span className={st}>"role"</span>
      <span className={pn}>:</span> <span className={st}>"user"</span>
      <span className={pn}>,</span> <span className={st}>"content"</span>
      <span className={pn}>:</span> <span className={st}>"Halo!"</span>
      <span className={pn}>{"}"}],</span>
      {"\n"}
      <span className={pn}>)</span>
      {"\n\n"}
      <span className={fn}>print</span>
      <span className={pn}>(</span>
      <span className={nm}>response</span>
      <span className={pn}>.</span>
      <span className={nm}>choices</span>
      <span className={pn}>[</span>
      <span className="text-amber-300">0</span>
      <span className={pn}>].</span>
      <span className={nm}>message</span>
      <span className={pn}>.</span>
      <span className={nm}>content</span>
      <span className={pn}>)</span>
    </code>
  );
}

function AnthropicCode() {
  return (
    <code>
      <span className={kw}>import</span> <span className={nm}>anthropic</span>
      {"\n\n"}
      <span className={nm}>client</span> <span className={pn}>=</span> <span className={nm}>anthropic</span>
      <span className={pn}>.</span>
      <span className={fn}>Anthropic</span>
      <span className={pn}>(</span>
      {"\n    "}
      <span className={nm}>base_url</span>
      <span className={pn}>=</span>
      <span className={st}>"https://www.greenrouter.eu.cc"</span>
      <span className={pn}>,</span>
      {"\n    "}
      <span className={nm}>api_key</span>
      <span className={pn}>=</span>
      <span className={st}>"gr-key-kamu"</span>
      <span className={pn}>,</span>
      {"\n"}
      <span className={pn}>)</span>
      {"\n\n"}
      <span className={nm}>message</span> <span className={pn}>=</span> <span className={nm}>client</span>
      <span className={pn}>.</span>
      <span className={nm}>messages</span>
      <span className={pn}>.</span>
      <span className={fn}>create</span>
      <span className={pn}>(</span>
      {"\n    "}
      <span className={nm}>model</span>
      <span className={pn}>=</span>
      <span className={st}>"deepseek-v4-flash-0731"</span>
      <span className={pn}>,</span>
      {"\n    "}
      <span className={nm}>max_tokens</span>
      <span className={pn}>=</span>
      <span className="text-amber-300">1024</span>
      <span className={pn}>,</span>
      {"\n    "}
      <span className={nm}>messages</span>
      <span className={pn}>=</span>
      <span className={pn}>[{"{"}</span>
      <span className={st}>"role"</span>
      <span className={pn}>:</span> <span className={st}>"user"</span>
      <span className={pn}>,</span> <span className={st}>"content"</span>
      <span className={pn}>:</span> <span className={st}>"Halo!"</span>
      <span className={pn}>{"}"}],</span>
      {"\n"}
      <span className={pn}>)</span>
      {"\n\n"}
      <span className={fn}>print</span>
      <span className={pn}>(</span>
      <span className={nm}>message</span>
      <span className={pn}>.</span>
      <span className={nm}>content</span>
      <span className={pn}>[</span>
      <span className="text-amber-300">0</span>
      <span className={pn}>].</span>
      <span className={nm}>text</span>
      <span className={pn}>)</span>
    </code>
  );
}

function NodeCode() {
  return (
    <code>
      <span className={kw}>import</span> <span className={fn}>OpenAI</span> <span className={kw}>from</span> <span className={st}>"openai"</span>
      <span className={pn}>;</span>
      {"\n\n"}
      <span className={kw}>const</span> <span className={nm}>client</span> <span className={pn}>=</span> <span className={kw}>new</span> <span className={fn}>OpenAI</span>
      <span className={pn}>({"{"}</span>
      {"\n  "}
      <span className={nm}>baseURL</span>
      <span className={pn}>:</span> <span className={st}>"{BASE}"</span>
      <span className={pn}>,</span>
      {"\n  "}
      <span className={nm}>apiKey</span>
      <span className={pn}>:</span> <span className={st}>"gr-key-kamu"</span>
      <span className={pn}>,</span>
      {"\n"}
      <span className={pn}>{"}"});</span>
      {"\n\n"}
      <span className={kw}>const</span> <span className={nm}>response</span> <span className={pn}>=</span> <span className={kw}>await</span> <span className={nm}>client</span>
      <span className={pn}>.</span>
      <span className={nm}>chat</span>
      <span className={pn}>.</span>
      <span className={nm}>completions</span>
      <span className={pn}>.</span>
      <span className={fn}>create</span>
      <span className={pn}>({"{"}</span>
      {"\n  "}
      <span className={nm}>model</span>
      <span className={pn}>:</span> <span className={st}>"deepseek-v4-flash-0731"</span>
      <span className={pn}>,</span>
      {"\n  "}
      <span className={nm}>messages</span>
      <span className={pn}>:</span> <span className={pn}>[{"{"}</span> <span className={nm}>role</span>
      <span className={pn}>:</span> <span className={st}>"user"</span>
      <span className={pn}>,</span> <span className={nm}>content</span>
      <span className={pn}>:</span> <span className={st}>"Halo!"</span> <span className={pn}>{"}"}],</span>
      {"\n"}
      <span className={pn}>{"}"});</span>
      {"\n\n"}
      <span className={nm}>console</span>
      <span className={pn}>.</span>
      <span className={fn}>log</span>
      <span className={pn}>(</span>
      <span className={nm}>response</span>
      <span className={pn}>.</span>
      <span className={nm}>choices</span>
      <span className={pn}>[</span>
      <span className="text-amber-300">0</span>
      <span className={pn}>].</span>
      <span className={nm}>message</span>
      <span className={pn}>.</span>
      <span className={nm}>content</span>
      <span className={pn}>);</span>
    </code>
  );
}

function CurlCode() {
  return (
    <code>
      <span className={fn}>curl</span> <span className={nm}>{BASE}/chat/completions</span> <span className={pn}>\</span>
      {"\n  "}
      <span className={pn}>-H</span> <span className={st}>"Authorization: Bearer gr-key-kamu"</span> <span className={pn}>\</span>
      {"\n  "}
      <span className={pn}>-H</span> <span className={st}>"Content-Type: application/json"</span> <span className={pn}>\</span>
      {"\n  "}
      <span className={pn}>-d</span> <span className={st}>'{"{"}</span>
      {"\n    "}
      <span className={st}>"model": "deepseek-v4-flash-0731",</span>
      {"\n    "}
      <span className={st}>"messages": [</span>
      {"\n      "}
      <span className={st}>{"{"} "role": "user", "content": "Halo!" {"}"}</span>
      {"\n    "}
      <span className={st}>]</span>
      {"\n  "}
      <span className={st}>{"}"}'</span>
    </code>
  );
}

const TABS: { name: string; render: () => ReactNode }[] = [
  { name: "Python", render: PythonCode },
  { name: "Anthropic", render: AnthropicCode },
  { name: "Node.js", render: NodeCode },
  { name: "cURL", render: CurlCode },
];

export default function CodeShowcase() {
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(PLAIN[TABS[tab].name]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const Active = TABS[tab].render;

  return (
    <div className="rounded-[20px] bg-black/60 text-left">
      {/* Bar tab */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-3 pt-2.5">
        {TABS.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-t-lg px-3.5 py-2 font-mono text-xs transition sm:text-[13px] ${
              i === tab
                ? "bg-white/[0.07] font-semibold text-lime-200"
                : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
            }`}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={copy}
          aria-label="Salin kode"
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            copied ? "bg-lime-400/15 text-lime-300" : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Disalin" : "Salin"}
        </button>
      </div>
      {/* Isi kode */}
      <div className="overflow-x-auto px-5 py-4">
        <pre className="min-w-max font-mono text-[12px] leading-relaxed sm:text-[13px]">
          <Active />
        </pre>
      </div>
    </div>
  );
}
