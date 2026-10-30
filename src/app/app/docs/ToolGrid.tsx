"use client";

import { useState } from "react";
import CodeBlock from "./CodeBlock";

const BASE = "https://www.greenrouter.eu.cc";

type Tool = {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  steps: string[];
  blocks: { title: string; code: string }[];
};

const TOOLS: Tool[] = [
  {
    id: "opencode",
    name: "OpenCode",
    logo: "/assets/tools/opencode.svg",
    tagline: "Agen coding terminal open-source.",
    steps: [
      "Instal OpenCode dengan perintah di bawah, atau unduh dari opencode.ai.",
      "Buat file opencode.json di folder proyekmu berisi konfigurasi GreenRouter berikut.",
      "Jalankan opencode di folder yang sama, lalu pilih model GreenRouter dari daftar model.",
    ],
    blocks: [
      { title: "terminal · instalasi", code: "npm install -g opencode-ai" },
      {
        title: "opencode.json",
        code: `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "greenrouter": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "${BASE}/v1",
        "apiKey": "gr-..."
      },
      "models": {
        "deepseek-v4-flash-0731": {},
        "glm-5.3-flash-dhl": {}
      }
    }
  }
}`,
      },
    ],
  },
  {
    id: "claudecode",
    name: "Claude Code",
    logo: "/assets/tools/claudecode.svg",
    tagline: "Agen coding terminal dari Anthropic, memakai format Anthropic GreenRouter.",
    steps: [
      "Instal Claude Code dengan perintah di bawah.",
      "Atur tiga variabel lingkungan berikut di terminalmu (perhatikan base URL tanpa /v1).",
      "Jalankan claude seperti biasa, semua request masuk lewat GreenRouter.",
    ],
    blocks: [
      { title: "terminal · instalasi", code: "npm install -g @anthropic-ai/claude-code" },
      {
        title: "terminal · konfigurasi",
        code: `export ANTHROPIC_BASE_URL="${BASE}"
export ANTHROPIC_API_KEY="gr-..."
export ANTHROPIC_MODEL="deepseek-v4-flash-0731"

claude`,
      },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    logo: "/assets/tools/codex-mark.svg",
    tagline: "Agen coding dari OpenAI.",
    steps: [
      "Instal Codex dengan perintah di bawah.",
      "Isi file ~/.codex/config.toml dengan konfigurasi GreenRouter berikut (wire_api chat, karena yang dipakai endpoint chat GreenRouter).",
      "Atur variabel lingkungan GREENROUTER_API_KEY, lalu jalankan codex.",
    ],
    blocks: [
      { title: "terminal · instalasi", code: "npm install -g @openai/codex" },
      {
        title: "~/.codex/config.toml",
        code: `model = "deepseek-v4-flash-0731"
model_provider = "greenrouter"

[model_providers.greenrouter]
name = "GreenRouter"
base_url = "${BASE}/v1"
env_key = "GREENROUTER_API_KEY"
wire_api = "chat"`,
      },
      { title: "terminal · key", code: `export GREENROUTER_API_KEY="gr-..."` },
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "/assets/tools/cursor.svg",
    tagline: "Editor kode berbasis AI.",
    steps: [
      "Buka Cursor, masuk ke Settings lalu bagian Models.",
      "Pada bagian OpenAI API Key, tempel API key GreenRouter milikmu.",
      "Aktifkan Override OpenAI Base URL dan isi dengan URL di bawah.",
      "Tambahkan model secara manual lewat Add model, misalnya deepseek-v4-flash-0731, lalu pilih model itu saat memakai chat atau composer.",
    ],
    blocks: [
      {
        title: "nilai yang diisi",
        code: `OpenAI Base URL : ${BASE}/v1
API Key         : gr-...
Model           : deepseek-v4-flash-0731`,
      },
    ],
  },
  {
    id: "cline",
    name: "Cline",
    logo: "/assets/tools/cline.svg",
    tagline: "Ekstensi agen coding untuk VS Code.",
    steps: [
      "Instal ekstensi Cline dari marketplace VS Code.",
      "Buka panel Cline, klik ikon pengaturan, lalu pilih API Provider: OpenAI Compatible.",
      "Isi Base URL, API Key, dan Model ID dengan nilai di bawah, lalu simpan.",
    ],
    blocks: [
      {
        title: "nilai yang diisi",
        code: `Base URL  : ${BASE}/v1
API Key   : gr-...
Model ID  : deepseek-v4-flash-0731`,
      },
    ],
  },
  {
    id: "continue",
    name: "Continue",
    logo: "/assets/tools/continue.png",
    tagline: "Ekstensi AI open-source untuk VS Code dan JetBrains.",
    steps: [
      "Instal ekstensi Continue dari marketplace editor kamu.",
      "Buka file konfigurasi Continue (config.yaml) dan tambahkan blok model GreenRouter berikut.",
      "Pilih model GreenRouter dari pemilih model di panel Continue.",
    ],
    blocks: [
      {
        title: "config.yaml",
        code: `name: GreenRouter
version: 1.0.0
schema: v1
models:
  - name: DeepSeek V4.1 Flash
    provider: openai
    model: deepseek-v4-flash-0731
    apiBase: ${BASE}/v1
    apiKey: gr-...`,
      },
    ],
  },
  {
    id: "aider",
    name: "Aider",
    logo: "/assets/tools/aider.png",
    tagline: "Pair programming AI langsung di terminal.",
    steps: [
      "Instal Aider dengan perintah di bawah.",
      "Atur dua variabel lingkungan berikut, lalu jalankan aider dengan model GreenRouter.",
    ],
    blocks: [
      { title: "terminal · instalasi", code: "python -m pip install aider-chat" },
      {
        title: "terminal · jalankan",
        code: `export OPENAI_API_BASE="${BASE}/v1"
export OPENAI_API_KEY="gr-..."

aider --model openai/deepseek-v4-flash-0731`,
      },
    ],
  },
  {
    id: "openwebui",
    name: "Open WebUI",
    logo: "/assets/tools/openwebui.png",
    tagline: "Antarmuka chat self-hosted untuk tim dan pribadi.",
    steps: [
      "Jalankan Open WebUI seperti biasa, lalu masuk sebagai admin.",
      "Buka Admin Panel, Settings, Connections, lalu bagian OpenAI API.",
      "Tambahkan koneksi dengan URL dan key di bawah, simpan, dan semua model GreenRouter langsung muncul di pemilih model.",
    ],
    blocks: [
      {
        title: "nilai yang diisi",
        code: `URL     : ${BASE}/v1
API Key : gr-...`,
      },
    ],
  },
];

export default function ToolGrid() {
  const [active, setActive] = useState<string | null>(null);
  const tool = TOOLS.find((t) => t.id === active) ?? null;

  return (
    <div>
      <p>
        Klik salah satu alat di bawah untuk melihat cara menghubungkannya ke GreenRouter.
        Semua alat memakai API key yang sama dari halaman Key.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id === active ? null : t.id)}
            className={`glass rounded-3xl p-4 text-left transition hover:-translate-y-0.5 ${
              t.id === active ? "tool-active" : ""
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt={t.name} className="h-7 w-7 object-contain" loading="lazy" />
            </span>
            <span
              className={`mt-3 block text-sm font-semibold ${
                t.id === active ? "text-lime-200" : "text-zinc-100"
              }`}
            >
              {t.name}
            </span>
          </button>
        ))}
      </div>

      {tool && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-zinc-100">{tool.name}</h3>
          <p className="mt-1">{tool.tagline}</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            {tool.steps.map((s) => (
              <li key={s.slice(0, 24)}>{s}</li>
            ))}
          </ol>
          <div className="mt-5 space-y-4">
            {tool.blocks.map((b) => (
              <CodeBlock key={b.title} title={b.title} code={b.code} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
