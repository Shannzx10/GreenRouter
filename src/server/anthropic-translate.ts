// Penerjemah protokol Anthropic Messages <-> OpenAI Chat Completions.
//
// Dipakai untuk provider yang TIDAK melayani endpoint /messages secara
// native (mis. Dahl): request Anthropic dari klien (Claude Code, Anthropic
// SDK) diterjemahkan ke format OpenAI, diteruskan ke {baseUrl}/chat/
// completions milik provider, lalu responsnya (termasuk stream SSE)
// diterjemahkan balik ke format Anthropic.
//
// Batasan yang melekat: fitur khas Anthropic tanpa padanan OpenAI
// (cache_control/prompt caching, parameter thinking, metadata) dibuang;
// blok thinking pada riwayat asisten tidak diteruskan balik ke hulu;
// input non-teks mengikuti kemampuan model hulu apa adanya.

type Any = Record<string, unknown>;

// Bentuk longgar tool_call OpenAI yang dibaca penerjemah.
type ToolCallLike = {
  id?: unknown;
  index?: unknown;
  function?: { name?: unknown; arguments?: unknown };
};

function textOfBlocks(blocks: unknown): string {
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b && typeof b === "object" && (b as Any).type === "text")
    .map((b) => String((b as Any).text ?? ""))
    .join("");
}

function imagePart(block: Any): Any | null {
  const src = block.source as Any | undefined;
  if (!src) return null;
  if (src.type === "base64" && src.data) {
    return {
      type: "image_url",
      image_url: { url: `data:${src.media_type ?? "image/png"};base64,${src.data}` },
    };
  }
  if (src.type === "url" && src.url) {
    return { type: "image_url", image_url: { url: String(src.url) } };
  }
  return null;
}

function toolResultText(block: Any): string {
  const c = block.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    const texts = c
      .filter((b) => b && typeof b === "object" && (b as Any).type === "text")
      .map((b) => String((b as Any).text ?? ""));
    if (texts.length) return texts.join("\n");
    try {
      return JSON.stringify(c);
    } catch {
      return "";
    }
  }
  return "";
}

// ---------- Request: Anthropic -> OpenAI ----------
export function anthropicToOpenAI(
  body: Record<string, unknown>,
  upstreamModelId: string,
): Record<string, unknown> {
  const src = body as Any;
  const messages: Any[] = [];

  const systemText = textOfBlocks(src.system);
  if (systemText) messages.push({ role: "system", content: systemText });

  for (const msg of (src.messages as Any[]) ?? []) {
    const role = msg?.role === "assistant" ? "assistant" : "user";
    const content = msg?.content;
    if (typeof content === "string") {
      messages.push({ role, content });
      continue;
    }
    if (!Array.isArray(content)) continue;

    if (role === "user") {
      // Hasil tool menjadi pesan role "tool" tersendiri di format OpenAI.
      for (const b of content) {
        if (b?.type === "tool_result") {
          messages.push({
            role: "tool",
            tool_call_id: String(b.tool_use_id ?? ""),
            content: toolResultText(b),
          });
        }
      }
      const parts: Any[] = [];
      let onlyText = true;
      for (const b of content) {
        if (b?.type === "text") parts.push({ type: "text", text: String(b.text ?? "") });
        else if (b?.type === "image") {
          const p = imagePart(b);
          if (p) {
            parts.push(p);
            onlyText = false;
          }
        }
      }
      if (parts.length) {
        messages.push({
          role: "user",
          content: onlyText ? parts.map((p) => p.text).join("") : parts,
        });
      }
    } else {
      const text = textOfBlocks(content);
      const toolCalls = content
        .filter((b) => b?.type === "tool_use")
        .map((b) => ({
          id: String(b.id ?? ""),
          type: "function",
          function: {
            name: String(b.name ?? ""),
            arguments: JSON.stringify(b.input ?? {}),
          },
        }));
      messages.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      });
    }
  }

  const out: Record<string, unknown> = { model: upstreamModelId, messages };
  if (Array.isArray(src.tools) && src.tools.length) {
    out.tools = src.tools.map((t: Any) => ({
      type: "function",
      function: {
        name: String(t?.name ?? ""),
        ...(t?.description ? { description: String(t.description) } : {}),
        parameters: (t?.input_schema as Any) ?? { type: "object", properties: {} },
      },
    }));
  }
  const tc = src.tool_choice as Any | undefined;
  if (tc && typeof tc === "object") {
    if (tc.type === "auto") out.tool_choice = "auto";
    else if (tc.type === "any") out.tool_choice = "required";
    else if (tc.type === "none") out.tool_choice = "none";
    else if (tc.type === "tool" && tc.name) {
      out.tool_choice = { type: "function", function: { name: String(tc.name) } };
    }
  }
  if (typeof src.max_tokens === "number") out.max_tokens = src.max_tokens;
  if (typeof src.temperature === "number") out.temperature = src.temperature;
  if (typeof src.top_p === "number") out.top_p = src.top_p;
  if (Array.isArray(src.stop_sequences) && src.stop_sequences.length) {
    out.stop = src.stop_sequences;
  }
  return out;
}

// ---------- Respons non-stream: OpenAI -> Anthropic ----------
export function mapStopReason(finish: unknown): string {
  switch (finish) {
    case "length":
      return "max_tokens";
    case "tool_calls":
      return "tool_use";
    case "stop":
    default:
      return "end_turn";
  }
}

export function openAIToAnthropic(
  json: Any,
  requestedModel: string,
): Record<string, unknown> {
  const choice = (json?.choices as Any[])?.[0] ?? {};
  const m = (choice.message as Any) ?? {};
  const content: Any[] = [];
  if (typeof m.reasoning === "string" && m.reasoning) {
    content.push({ type: "thinking", thinking: m.reasoning, signature: "" });
  }
  if (typeof m.content === "string" && m.content) {
    content.push({ type: "text", text: m.content });
  }
  for (const tc of (m.tool_calls as ToolCallLike[]) ?? []) {
    let input: unknown = {};
    try {
      input = JSON.parse(String(tc?.function?.arguments ?? "{}"));
    } catch {
      input = {};
    }
    content.push({
      type: "tool_use",
      id: String(tc?.id ?? ""),
      name: String(tc?.function?.name ?? ""),
      input,
    });
  }
  if (!content.length) content.push({ type: "text", text: "" });
  const usage = (json?.usage as Any) ?? {};
  const rawId = String(json?.id ?? "");
  return {
    id: rawId.startsWith("msg_") ? rawId : `msg_${rawId || Math.random().toString(36).slice(2, 14)}`,
    type: "message",
    role: "assistant",
    model: requestedModel,
    content,
    stop_reason: mapStopReason(choice.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: Number(usage.prompt_tokens ?? 0),
      output_tokens: Number(usage.completion_tokens ?? 0),
    },
  };
}

// ---------- Stream: OpenAI SSE -> Anthropic SSE ----------
// Menghasilkan stream event Anthropic yang sah (message_start -> blok
// thinking/text/tool_use -> message_delta -> message_stop) dari stream
// chat completions hulu. onDone dipanggil sekali di akhir stream normal
// membawa usage untuk pencatatan; stream yang diputus klien tidak
// memanggilnya (sama seperti perilaku jalur native yang sudah diterima).
export function translateOpenAIStream(
  upstreamBody: ReadableStream<Uint8Array>,
  requestedModel: string,
  onDone: (usage: { promptTokens?: number; completionTokens?: number }) => void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const reader = upstreamBody.getReader();
  const decoder = new TextDecoder();

  let started = false;
  let buffer = "";
  let nextIndex = 0;
  let openKind: "thinking" | "text" | "tool_use" | null = null;
  let openIndex = -1;
  let openToolKey: string | null = null;
  const toolBlocks = new Map<string, number>();
  let finishReason: unknown = null;
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;
  let sawError = false;

  const events: string[] = [];
  const emit = (type: string, data: Any) => {
    events.push(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
  };
  const ensureStarted = () => {
    if (started) return;
    started = true;
    emit("message_start", {
      message: {
        id: `msg_${Math.random().toString(36).slice(2, 14)}`,
        type: "message",
        role: "assistant",
        model: requestedModel,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    });
  };
  const closeBlock = () => {
    if (openKind === null) return;
    emit("content_block_stop", { index: openIndex });
    openKind = null;
    openIndex = -1;
    openToolKey = null;
  };
  const openBlock = (kind: "thinking" | "text" | "tool_use", block: Any, toolKey?: string) => {
    closeBlock();
    openKind = kind;
    openIndex = nextIndex++;
    openToolKey = toolKey ?? null;
    emit("content_block_start", { index: openIndex, content_block: block });
  };

  const handleChunk = (chunk: Any) => {
    const usage = chunk?.usage as { prompt_tokens?: unknown; completion_tokens?: unknown } | undefined;
    if (usage) {
      if (typeof usage.prompt_tokens === "number") promptTokens = usage.prompt_tokens;
      if (typeof usage.completion_tokens === "number") {
        completionTokens = usage.completion_tokens;
      }
    }
    if (chunk?.error) {
      sawError = true;
      ensureStarted();
      closeBlock();
      emit("error", {
        error: {
          type: "api_error",
          message: "Layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.",
        },
      });
      return;
    }
    const choice = (chunk?.choices as Any[])?.[0];
    if (!choice) return;
    if (choice.finish_reason) finishReason = choice.finish_reason;
    const delta = (choice.delta as Any) ?? {};

    const reasoning =
      typeof delta.reasoning === "string"
        ? delta.reasoning
        : typeof delta.reasoning_content === "string"
          ? delta.reasoning_content
          : "";
    if (reasoning) {
      ensureStarted();
      if (openKind !== "thinking") {
        openBlock("thinking", { type: "thinking", thinking: "", signature: "" });
      }
      emit("content_block_delta", {
        index: openIndex,
        delta: { type: "thinking_delta", thinking: reasoning },
      });
    }
    if (typeof delta.content === "string" && delta.content) {
      ensureStarted();
      if (openKind !== "text") openBlock("text", { type: "text", text: "" });
      emit("content_block_delta", {
        index: openIndex,
        delta: { type: "text_delta", text: delta.content },
      });
    }
    for (const tc of (delta.tool_calls as ToolCallLike[]) ?? []) {
      const key = `tc${typeof tc?.index === "number" ? tc.index : toolBlocks.size}`;
      ensureStarted();
      if (!toolBlocks.has(key)) {
        openBlock(
          "tool_use",
          {
            type: "tool_use",
            id: String(tc?.id ?? `toolu_${Math.random().toString(36).slice(2, 12)}`),
            name: String(tc?.function?.name ?? ""),
            input: {},
          },
          key,
        );
        toolBlocks.set(key, openIndex);
      } else if (openToolKey !== key) {
        // Kembali ke blok tool yang sudah terbuka sebelumnya.
        closeBlock();
        openKind = "tool_use";
        openIndex = toolBlocks.get(key)!;
        openToolKey = key;
        // Blok lama dianggap dibuka lagi tanpa content_block_start baru;
        // praktiknya stream tool hulu berjalan berurutan per index.
      }
      const argsFrag = tc?.function?.arguments;
      if (typeof argsFrag === "string" && argsFrag) {
        emit("content_block_delta", {
          index: toolBlocks.get(key)!,
          delta: { type: "input_json_delta", partial_json: argsFrag },
        });
      }
    }
  };

  const finalize = () => {
    ensureStarted();
    closeBlock();
    if (!sawError) {
      emit("message_delta", {
        delta: { stop_reason: mapStopReason(finishReason), stop_sequence: null },
        usage: {
          input_tokens: promptTokens ?? 0,
          output_tokens: completionTokens ?? 0,
        },
      });
      emit("message_stop", {});
    }
    onDone({ promptTokens, completionTokens });
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        finalize();
        for (const e of events.splice(0)) controller.enqueue(encoder.encode(e));
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          handleChunk(JSON.parse(data));
        } catch {
          /* potongan bukan JSON utuh, abaikan */
        }
      }
      for (const e of events.splice(0)) controller.enqueue(encoder.encode(e));
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
