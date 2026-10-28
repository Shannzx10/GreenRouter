import { createServer } from "node:http";

const MARKER = "RAW-HULU-JANGAN-BOCOR";
createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let model = "unknown";
    try {
      model = JSON.parse(body).model ?? "unknown";
    } catch {}
    const status = model === "stub-fail-409" ? 409 : 503;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: `${MARKER} detail ${status}` } }));
  });
}).listen(8899, "127.0.0.1", () => console.log("stub2 di 8899"));
