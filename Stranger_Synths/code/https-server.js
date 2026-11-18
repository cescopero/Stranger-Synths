/**
 * https-server.js (versione snella)
 * ---------------------------------
 * 1. Serve i file della propria cartella (code/) via HTTPS (porta 5500)
 * 2. POST /osc-forward: riceve messaggi OSC dalla pagina e li inoltra via UDP
 *
 * Richiede key.pem e cert.pem (mkcert) nella stessa cartella di questo file.
 * Nessun pacchetto npm: usa solo moduli di Node.
 *
 * Avvio:  node https-server.js
 */
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const os    = require("os");
const dgram = require("dgram");

const HTTPS_PORT  = 5500;
const BROWSER_DIR = __dirname;
const KEY_PATH    = path.join(__dirname, "key.pem");
const CERT_PATH   = path.join(__dirname, "cert.pem");
const DEFAULT_PAGE = "/mediapipe-osc.html";

if (!fs.existsSync(KEY_PATH) || !fs.existsSync(CERT_PATH)) {
  console.error("ERRORE: key.pem / cert.pem non trovati accanto a https-server.js (generali con mkcert).");
  process.exit(1);
}

// ---- UDP / OSC ----
const oscSocket = dgram.createSocket("udp4");
oscSocket.bind();

const pad4 = (n) => Math.ceil(n / 4) * 4;
function oscString(s) {
  const b = Buffer.alloc(pad4(s.length + 1));
  b.write(s, 0, "ascii");
  return b;
}
function oscMessage(address, args) {
  const floats = args.map((v) => { const b = Buffer.alloc(4); b.writeFloatBE(Number(v), 0); return b; });
  return Buffer.concat([oscString(address), oscString("," + args.map(() => "f").join("")), ...floats]);
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".wasm": "application/wasm",
  ".task": "application/octet-stream",
};

const server = https.createServer(
  { key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CERT_PATH) },
  (req, res) => {
    // POST /osc-forward  body: { ip, port, messages: [{ address, args }] }
    if (req.method === "POST" && req.url === "/osc-forward") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { ip, port, messages } = JSON.parse(body);
          if (!ip || !port || !Array.isArray(messages)) throw new Error("Formato non valido");
          for (const m of messages) {
            if (m.address && Array.isArray(m.args)) {
              const buf = oscMessage(m.address, m.args);
              oscSocket.send(buf, 0, buf.length, port, ip);
            }
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ sent: messages.length }));
        } catch (e) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // File statici
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = DEFAULT_PAGE;
    const filePath = path.join(BROWSER_DIR, urlPath);
    if (!filePath.startsWith(BROWSER_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end("Non trovato"); return; }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  }
);

server.listen(HTTPS_PORT, "0.0.0.0", () => {
  console.log(`Server HTTPS attivo sulla porta ${HTTPS_PORT}`);
  console.log(`  Mac:      https://localhost:${HTTPS_PORT}/`);
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === "IPv4" && !i.internal) console.log(`  Telefono: https://${i.address}:${HTTPS_PORT}/`);
    }
  }
});
