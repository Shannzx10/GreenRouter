"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  RotateCcw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import ProviderIcon from "../../ProviderIcon";
import { PANEL } from "../ui";

export type PlaygroundModel = {
  modelId: string;
  displayName: string;
  contextTokens: number | null;
  maxOutputTokens: number | null;
  earlyAccess: boolean;
  locked: boolean;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  tokens?: number | null;
  secs?: number;
  stopped?: boolean;
  pending?: boolean;
  empty?: boolean;
};

type Usage = { total_tokens?: number };

const EXAMPLES = [
  "Jelaskan apa itu API dengan bahasa sederhana",
  "Buatkan fungsi debounce di JavaScript beserta contoh pakainya",
  "Tulis pantun tentang ngoding di malam hari",
];

const MAX_TOKEN_OPTIONS = [1024, 2048, 4096, 8192];

function fmtTokens(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

const labelCls =
  "mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500";

export default function PlaygroundChat({
  models,
  initialModelId,
  quota,
}: {
  models: PlaygroundModel[];
  initialModelId: string;
  quota: { used: number; limit: number } | null;
}) {
  const [modelId, setModelId] = useState(initialModelId);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [quotaUsed, setQuotaUsed] = useState(quota?.used ?? 0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const model = models.find((m) => m.modelId === modelId) ?? models[0];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  function patchLast(patch: Partial<Msg>) {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return next;
    });
  }

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || busy || !model || model.locked) return;
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", pending: true }]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setError(null);
    setBusy(true);
    const started = performance.now();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    let usage: Usage | null = null;
    let stopped = false;
    try {
      const res = await fetch("/api/user/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: model.modelId,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          system: system.trim() || undefined,
          temperature,
          maxTokens,
        }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? "Request gagal diproses, coba lagi nanti.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const chunk = JSON.parse(payload) as {
              choices?: { delta?: { content?: unknown } }[];
              usage?: Usage;
            };
            const delta = chunk.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              acc += delta;
              patchLast({ content: acc });
            }
            if (chunk.usage) usage = chunk.usage;
          } catch {
            // Potongan SSE yang tidak utuh diabaikan.
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        stopped = true;
      } else {
        setError((e as Error).message || "Request gagal diproses, coba lagi nanti.");
        setMessages(history);
        setBusy(false);
        return;
      }
    }
    const secs = (performance.now() - started) / 1000;
    patchLast({
      content: acc,
      pending: false,
      stopped,
      empty: acc.trim() === "" && !stopped,
      tokens: usage?.total_tokens ?? null,
      secs,
    });
    if (usage?.total_tokens) setQuotaUsed((u) => u + (usage?.total_tokens ?? 0));
    setBusy(false);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    if (busy) return;
    setMessages([]);
    setError(null);
  }

  const quotaPct =
    quota && quota.limit > 0 ? Math.min(100, Math.round((quotaUsed / quota.limit) * 100)) : 0;

  return (
    <div>
      {/* ===== Panel kontrol ===== */}
      <div className={PANEL}>
        {/* Di mobile pemilih model dapat baris sendiri selebar panel dan
            kedua tombol berbagi baris di bawahnya; mulai sm tombol naik
            sebaris di kanan pemilih. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3 sm:flex-1">
            {model && <ProviderIcon modelId={model.modelId} className="h-10 w-10 shrink-0" />}
            <div className="relative w-full sm:max-w-sm">
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                disabled={busy}
                aria-label="Pilih model"
                className="w-full appearance-none truncate rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-3.5 pr-10 text-sm font-medium outline-none transition focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15 disabled:opacity-50 [&>option]:bg-zinc-900"
              >
                {models.map((m) => (
                  <option key={m.modelId} value={m.modelId} disabled={m.locked}>
                    {m.displayName}
                    {m.locked ? " (Akses Awal)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-expanded={showSettings}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                showSettings
                  ? "bg-lime-400 text-zinc-950 hover:bg-lime-300"
                  : "border border-white/15 bg-white/[0.03] text-zinc-100 hover:border-lime-300/50 hover:text-lime-200"
              }`}
            >
              <SlidersHorizontal size={15} /> Pengaturan
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={busy || messages.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-lime-300/50 hover:text-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={15} /> Percakapan Baru
            </button>
          </div>
        </div>

        {model && (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            <code className="font-mono text-lime-300/90">{model.modelId}</code>
            {fmtTokens(model.contextTokens) && <span>· Konteks {fmtTokens(model.contextTokens)}</span>}
            {fmtTokens(model.maxOutputTokens) && (
              <span>· Output maks {fmtTokens(model.maxOutputTokens)}</span>
            )}
            {model.earlyAccess && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                <Sparkles size={11} /> Akses Awal
              </span>
            )}
          </p>
        )}

        {showSettings && (
          <div className="mt-5 grid gap-5 border-t border-white/[0.07] pt-5 sm:grid-cols-3 sm:gap-4">
            <div className="sm:col-span-3">
              <label htmlFor="pg-system" className={labelCls}>
                Pesan Sistem (opsional)
              </label>
              <textarea
                id="pg-system"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Misalnya: Kamu adalah asisten yang menjawab singkat dan selalu berbahasa Indonesia."
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15"
              />
            </div>
            <div>
              <span className={labelCls}>Suhu: {temperature.toFixed(1)}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                aria-label="Suhu"
                className="w-full accent-lime-400"
              />
              <p className="mt-1 text-[11px] text-zinc-500">Rendah lebih pasti, tinggi lebih kreatif.</p>
            </div>
            <div>
              <span className={labelCls}>Token Jawaban Maks</span>
              <div className="flex flex-wrap gap-1.5">
                {MAX_TOKEN_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={maxTokens === n}
                    onClick={() => setMaxTokens(n)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      maxTokens === n
                        ? "bg-lime-400 font-semibold text-zinc-950"
                        : "border border-white/10 text-zinc-300 hover:border-lime-300/40 hover:text-lime-200"
                    }`}
                  >
                    {n.toLocaleString("id-ID")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={labelCls}>Cara Kerja</span>
              <p className="text-xs leading-relaxed text-zinc-500">
                Setiap jawaban tercatat di Log Pemakaian dan memotong kuota siklus akunmu, sama seperti
                request lewat API.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== Panel percakapan ===== */}
      <div className="glass mt-5 overflow-hidden rounded-3xl">
        <div ref={scrollRef} className="h-[46vh] min-h-[320px] space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-300">
                <Sparkles size={20} />
              </span>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
                Pilih model di atas, lalu tulis pesan pertamamu. Cocok untuk mencoba model sebelum
                dipakai lewat API.
              </p>
              <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => send(ex)}
                    disabled={busy || !model || model.locked}
                    className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-lime-300/40 hover:text-lime-200 disabled:opacity-40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-lime-400 px-4 py-3 text-sm font-medium leading-relaxed text-zinc-950 sm:max-w-[75%]">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  {model && (
                    <ProviderIcon modelId={model.modelId} className="mt-1 h-8 w-8 shrink-0" />
                  )}
                  <div className="min-w-0 max-w-[92%] sm:max-w-[85%]">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-xs font-semibold text-zinc-200">{model?.displayName}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                        {model?.modelId}
                      </span>
                    </p>
                    <div className="mt-1.5 rounded-3xl rounded-tl-md border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                      {m.pending && m.content === "" ? (
                        <span className="flex items-center gap-1.5 py-1" aria-label="Model sedang menjawab">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-lime-300/80 [animation-delay:-0.2s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-lime-300/80 [animation-delay:-0.1s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-lime-300/80" />
                        </span>
                      ) : m.empty ? (
                        <p className="text-sm italic leading-relaxed text-zinc-500">
                          Model tidak memberikan jawaban. Coba lagi, atau pilih model lain.
                        </p>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200">
                          {m.content}
                          {m.pending && <span className="ml-1 animate-pulse text-lime-300">▍</span>}
                        </p>
                      )}
                    </div>
                    {!m.pending && (m.tokens != null || m.secs != null || m.stopped) && (
                      <p className="mt-1.5 text-[11px] tabular-nums text-zinc-500">
                        {[
                          m.tokens != null ? `${m.tokens.toLocaleString("id-ID")} token` : null,
                          m.secs != null ? `${m.secs.toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk` : null,
                          m.stopped ? "dihentikan" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        {error && (
          <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200 sm:mx-6">
            <p className="min-w-0 flex-1 leading-relaxed">{error}</p>
            <button
              type="button"
              aria-label="Tutup pesan error"
              onClick={() => setError(null)}
              className="shrink-0 rounded-lg p-1 text-red-300/80 transition hover:bg-white/[0.06] hover:text-red-200"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t border-white/[0.06] p-3 sm:p-4"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Tulis pesanmu di sini…"
              aria-label="Tulis pesan"
              className="max-h-[160px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60 focus:ring-2 focus:ring-lime-300/15"
            />
            {busy ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Berhenti menjawab"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-zinc-100 transition hover:border-red-300/50 hover:text-red-200"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim() === "" || !model || model.locked}
                aria-label="Kirim pesan"
                className="btn-shine flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime-400 text-zinc-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1">
            <p className="text-[11px] text-zinc-500">
              Enter untuk kirim, Shift + Enter untuk baris baru. Jawaban AI bisa keliru.
            </p>
            {quota && (
              <p className="text-[11px] tabular-nums text-zinc-500">
                Kuota siklus:{" "}
                <span className="font-medium text-zinc-300">{quotaUsed.toLocaleString("id-ID")}</span>{" "}
                dari {quota.limit.toLocaleString("id-ID")} token ({quotaPct}%)
              </p>
            )}
          </div>
          {quota && (
            <div className="mx-1 mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-lime-400 transition-all"
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
