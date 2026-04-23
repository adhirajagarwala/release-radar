import http from "node:http";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import { sampleUpdates } from "../data/sample-updates.js";
import { createBrief } from "./brief.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const webDir = path.join(rootDir, "web");
const port = Number(process.env.PORT || 3300);
const host = process.env.HOST || "127.0.0.1";

function send(response, statusCode, payload, contentType = "application/json; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType, "Cache-Control": "no-store" });
  response.end(contentType.startsWith("application/json") ? `${JSON.stringify(payload, null, 2)}\n` : payload);
}

async function handler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/") {
    send(response, 200, await fs.readFile(path.join(webDir, "index.html"), "utf8"), "text/html; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/app.js") {
    send(response, 200, await fs.readFile(path.join(webDir, "app.js"), "utf8"), "application/javascript; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/styles.css") {
    send(response, 200, await fs.readFile(path.join(webDir, "styles.css"), "utf8"), "text/css; charset=utf-8");
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/briefs") {
    send(response, 200, sampleUpdates.map(createBrief));
    return;
  }

  send(response, 404, { error: "Not found" });
}

export function createServer() {
  return http.createServer((request, response) => {
    handler(request, response).catch((error) => send(response, 500, { error: error.message }));
  });
}

if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  createServer().listen(port, host, () => {
    console.log(`Release Radar listening at http://${host}:${port}`);
  });
}
