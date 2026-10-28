import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const HITS = "/tmp/stub-hits.json";
const MARKER = "RAW-HULU-JANGAN-BOCOR";

function bump(model) {
  const data = existsSync(HITS) ? JSON.parse(readFileSync(HITS, "utf8")) : {};
  data[model] = (data[model] ?? 0) + 1;
  writeFileSync(HITS, JSON.stringify(data));
}

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let model = "unknown";
    try {
      model = JSON.parse(body).model ?? "unknown";
    } catch {}
    bump(model);
    if (model === "stub-fail-400") {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: `${MARKER} bad request detail` } }));
      return;
    }
    if (model === "stub-fail-402") {
      res.writeHead(402, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: `${MARKER} insufficient credit` } }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-stub",
        object: "chat.completion",
        model,
        choices: [
          { index: 0, message: { role: "assistant", content: "Balasan stub OK" }, finish_reason: "stop" },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 4, total_tokens: 9 },
      }),
    );
  });
}).listen(8899, "127.0.0.1", () => console.log("stub di 8899"));
