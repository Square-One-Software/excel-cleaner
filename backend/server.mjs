import {createServer} from "node:http";
import {close, getCount, increment} from "./store.mjs";

const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT) || 3000;
const corsOrigin = process.env.CORS_ORIGIN ?? "https://square-one-software.github.io";
const maxBodyBytes = 1024;
const rateWindowMs = 60_000;
const rateMaxPosts = 20;
const hits = new Map();

function handleJsonRes(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress ?? "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < rateWindowMs);
  if (recent.length >= rateMaxPosts) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        const err = new Error("payload too large");
        err.code = "PAYLOAD_TOO_LARGE";
        reject(err);
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function statsBody(filesProcessed) {
  return {filesProcessed};
}

const server = createServer(async (req, res) => {
  setCors(res);

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const method = req.method ?? "GET";

  if (url.pathname === "/health" && method === "GET") {
    handleJsonRes(res, 200, {ok: true});
    return;
  }

  if (url.pathname === "/stats") {
    if (method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === "GET") {
      handleJsonRes(res, 200, statsBody(getCount()));
      return;
    }

    if (method === "POST") {
      const ip = clientIp(req);
      if (isRateLimited(ip)) {
        res.setHeader("Retry-After", "60");
        handleJsonRes(res, 429, {error: "rate limited"});
        return;
      }

      try {
        await readBody(req, maxBodyBytes);
      } catch (err) {
        if (err.code === "PAYLOAD_TOO_LARGE") {
          handleJsonRes(res, 413, {error: "payload too large"});
          return;
        }
        handleJsonRes(res, 400, {error: "bad request"});
        return;
      }

      handleJsonRes(res, 200, statsBody(increment()));
      return;
    }

    handleJsonRes(res, 405, {error: "method not allowed"});
    return;
  }

  handleJsonRes(res, 404, {error: "not found"});
});

function shutdown() {
  server.close(() => {
    close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
