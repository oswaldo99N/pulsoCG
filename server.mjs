import http from "node:http";
import { networkEndpoints } from "./public/network.js";
import { readFile, mkdir, writeFile, rename, copyFile, access, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyAction, initialState, persistedState, publicState } from "./src/playout-state.mjs";
import { motionTiming } from "./public/templates.js";
import { ASSET_PATTERN } from "./public/sports.js";
import { PROFILE_PRESETS } from "./public/presets.js";
import { runSimulation } from "./src/simulation.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const appVersion = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")).version;
const publicDir = path.join(root, "public");
// Los datos viven en la carpeta estándar del sistema, no junto al programa:
// así sobreviven si se mueve, actualiza o reinstala Pulso CG, y comparten la
// misma ubicación la app de escritorio, start.sh y los lanzadores.
//   macOS:   ~/Library/Application Support/Pulso CG/data
//   Windows: %APPDATA%\Pulso CG\data
//   Linux:   ~/.local/share/pulso-cg/data
export function defaultDataDir() {
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "Pulso CG", "data");
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Pulso CG", "data");
  return path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "pulso-cg", "data");
}
const dataDir = process.env.PULSO_DATA ? path.resolve(process.env.PULSO_DATA) : defaultDataDir();
const legacyDataDir = path.join(root, "data");
const stateFile = path.join(dataDir, "state.json");
const customLogoFile = path.join(dataDir, "custom-logo");
const logoMetaFile = path.join(dataDir, "custom-logo.json");
const backupFile = path.join(dataDir, "state.backup.json");
const assetsDir = path.join(dataDir, "assets");
const ASSET_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const ASSET_MIME = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
const port = Number(process.env.PULSO_PORT) || 4173;
// Identifica este arranque: si cambia, las salidas de OBS/vMix se recargan
// solas y así nunca se quedan con una versión vieja del programa.
const boot = Date.now().toString(36);
const clients = new Map(); // respuesta SSE → "output" | "panel" | "probe"
// Diagnóstico: quién abrió la salida (OBS, vMix, navegador) y errores que reportan.
const activity = [];
function logActivity(entry) {
  activity.unshift({ time: new Date().toISOString(), ...entry });
  activity.length = Math.min(activity.length, 20);
  console.log(`[${new Date().toLocaleTimeString()}] ${entry.kind === "error" ? "ERROR en " : ""}${entry.who}: ${entry.detail}`);
}
function whoIs(req) {
  const agent = String(req.headers["user-agent"] || "");
  if (/OBS/i.test(agent)) return "OBS";
  if (/vMix/i.test(agent)) return "vMix";
  if (/Headless/i.test(agent)) return "Prueba automática";
  const browser = agent.match(/(Edg|Vivaldi|OPR|Firefox|Chrome|Safari)\//)?.[1] ?? "Navegador";
  return { Edg: "Edge", OPR: "Opera" }[browser] ?? browser;
}

// Primera vez con la nueva ubicación: se copian los datos de la carpeta del
// programa (versiones anteriores). La carpeta vieja queda intacta como respaldo.
async function exists(file) { try { await access(file); return true; } catch { return false; } }
if (!process.env.PULSO_DATA && !(await exists(path.join(dataDir, "state.json"))) && (await exists(path.join(legacyDataDir, "state.json")))) {
  await mkdir(dataDir, { recursive: true });
  await cp(legacyDataDir, dataDir, { recursive: true, force: false, errorOnExist: false });
  console.log(`Datos trasladados a ${dataDir} (la carpeta anterior se conserva como respaldo).`);
}
await mkdir(assetsDir, { recursive: true });
async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
let persisted = {};
try {
  persisted = await readJson(stateFile);
} catch (error) {
  // Si el archivo principal está dañado (apagón a mitad de guardado), se usa la copia.
  if (error.code !== "ENOENT") {
    try {
      persisted = await readJson(backupFile);
      console.warn("Aviso: data/state.json estaba dañado; se recuperó la copia de seguridad.");
    } catch {}
  }
}
let state = initialState(persisted);
let logoMeta = { exists: false, mime: "image/png", revision: 0 };
try {
  const savedLogoMeta = JSON.parse(await readFile(logoMetaFile, "utf8"));
  await readFile(customLogoFile);
  if (["image/png", "image/jpeg", "image/webp"].includes(savedLogoMeta.mime)) logoMeta = { ...savedLogoMeta, exists: true };
} catch {}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp"
};

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": mimeTypes[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

// Guardado atómico y en cola: se escribe un archivo temporal y se renombra,
// así un corte de luz nunca deja state.json a medias. Funciona igual en
// Windows, macOS y Linux. Cada cierto tiempo se renueva una copia de seguridad.
let saving = Promise.resolve();
let lastBackup = 0;
function saveState() {
  const body = JSON.stringify(persistedState(state), null, 2);
  saving = saving.then(async () => {
    const temp = `${stateFile}.tmp`;
    await writeFile(temp, body);
    await rename(temp, stateFile);
    if (Date.now() - lastBackup > 60_000) {
      lastBackup = Date.now();
      await copyFile(stateFile, backupFile);
    }
  }).catch(error => console.error("No se pudo guardar data/state.json:", error.message));
  return saving;
}

function lanAddresses() {
  return networkEndpoints(os.networkInterfaces(), port).map(entry => entry.address);
}

// Estado + información del servidor (cuántas salidas de OBS/vMix escuchan).
function snapshot() {
  const outputs = [...clients.values()].filter(kind => kind === "output").length;
  const sim = simulation && { preset: simulation.preset, name: simulation.name, label: simulation.label, index: simulation.index, total: simulation.total };
  return { ...publicState(state), server: { boot, port, outputs, addresses: lanAddresses(), network: networkEndpoints(os.networkInterfaces(), port), now: Date.now(), simulation: sim, activity: activity.slice(0, 8), dataDir } };
}

function broadcast() {
  const message = `event: state\ndata: ${JSON.stringify(snapshot())}\n\n`;
  for (const client of clients.keys()) client.write(message);
}

// Mantiene vivas las conexiones y detecta enseguida las que se cortaron.
setInterval(() => { for (const client of clients.keys()) client.write(": ping\n\n"); }, 15_000).unref();

function settle(id, itemRevision, delay, next) {
  setTimeout(async () => {
    const updated = applyAction(state, { type: "settle", id, itemRevision, ...next });
    if (updated !== state) {
      state = updated;
      await saveState();
      broadcast();
    }
  }, delay);
}

// Oculta el gráfico solo tras N segundos en pantalla, salvo que el operador
// lo haya cambiado, ocultado o eliminado entretanto (cambia su revision).
function scheduleAutoOut(id, itemRevision, delay) {
  setTimeout(async () => {
    const item = state.items.find(entry => entry.id === id);
    if (!item?.onAir || item.revision !== itemRevision) return;
    await commit(applyAction(state, { type: "item_hide", id }));
  }, delay);
}

async function commit(next, previous = state) {
  state = next;
  await saveState();
  broadcast();
  const before = new Map(previous.items.map(item => [item.id, item.revision]));
  for (const item of state.items) {
    if (before.get(item.id) === item.revision) continue;
    const timing = motionTiming(item.graphic.style);
    if (item.phase === "entering" || item.phase === "updating") {
      const delay = item.phase === "entering" ? timing.enter : timing.update;
      settle(item.id, item.revision, delay, { phase: "live", onAir: true });
      const autoOut = Number(item.graphic.style.autoOut) || 0;
      if (autoOut > 0) scheduleAutoOut(item.id, item.revision, delay + autoOut * 1000);
    }
    if (item.phase === "exiting") settle(item.id, item.revision, timing.exit + 40, { phase: "idle", onAir: false });
  }
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4_000_000) throw new Error("payload_too_large");
  }
  return JSON.parse(body || "{}");
}

async function readBinary(req, limit = 2_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function validImageSignature(file, mime) {
  if (mime === "image/png") return file.length > 8 && file.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return file.length > 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
  if (mime === "image/webp") return file.length > 12 && file.toString("ascii", 0, 4) === "RIFF" && file.toString("ascii", 8, 12) === "WEBP";
  return false;
}

async function serveStatic(req, res, pathname) {
  const route = pathname === "/" ? "/index.html" : pathname === "/output" ? "/output.html" : pathname === "/test-obs" ? "/test-obs.html" : pathname;
  const requested = path.resolve(publicDir, `.${route}`);
  if (!requested.startsWith(publicDir + path.sep)) return json(res, 403, { error: "forbidden" });
  try {
    const file = await readFile(requested);
    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(requested)] || "application/octet-stream",
      // Es una herramienta local de produccion: el panel y OBS/vMix deben ver
      // cada ajuste de diseno inmediatamente, sin conservar CSS o JS antiguos.
      "Cache-Control": "no-store"
    });
    res.end(file);
  } catch {
    json(res, 404, { error: "not_found" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/network") return json(res, 200, {
    port, interfaces: networkEndpoints(os.networkInterfaces(), port), listening: server.address(),
    clientAddress: req.socket.remoteAddress?.replace(/^::ffff:/, ""), serverAddress: req.socket.localAddress?.replace(/^::ffff:/, "")
  });
  if (req.method === "GET" && url.pathname === "/api/state") return json(res, 200, snapshot());

  // Cada vez que alguien abre la salida o la página de prueba queda registrado.
  if (req.method === "GET" && ["/output", "/test-obs"].includes(url.pathname) && url.searchParams.get("mode") !== "editor") {
    logActivity({ kind: "open", who: whoIs(req), detail: `abrió ${url.pathname}${url.search}` });
    setTimeout(broadcast, 50);
  }

  // Errores de JavaScript que ocurren dentro de OBS/vMix (no tienen consola visible).
  if (req.method === "POST" && url.pathname === "/api/client-log") {
    try {
      const body = await readBody(req);
      logActivity({ kind: "error", who: whoIs(req), detail: String(body.message ?? "").slice(0, 300) });
      broadcast();
    } catch {}
    return json(res, 200, { ok: true });
  }

  // Escudos y logos: se guardan por su contenido (mismo archivo = mismo id).
async function saveAsset(file, mime) {
  const ext = ASSET_TYPES[mime];
  if (!ext || !validImageSignature(file, mime)) throw new Error("unsupported_image");
  const id = `${createHash("sha256").update(file).digest("hex").slice(0, 20)}.${ext}`;
  const target = path.join(assetsDir, id);
  try { await access(target); } catch { await writeFile(target, file); }
  return id;
}
function assetIdsOf(items) {
  return [...new Set(items.flatMap(item => [...Object.values(item.graphic.fields), item.graphic.style?.logoAsset]).filter(value => ASSET_PATTERN.test(String(value))))];
}

// Copia de seguridad de un perfil: gráficos, guardados y estilos en un .json.
  if (req.method === "GET" && url.pathname === "/api/export") {
    const id = url.searchParams.get("profile") || state.activeProfile;
    const profile = state.profiles.find(item => item.id === id);
    if (!profile) return json(res, 404, { error: "not_found" });
    const data = id === state.activeProfile ? state : state.profileData[id];
    // Los escudos viajan dentro de la copia, así nada se pierde al cambiar de equipo.
    const assets = {};
    for (const assetId of assetIdsOf(data.items)) {
      try { assets[assetId] = (await readFile(path.join(assetsDir, assetId))).toString("base64"); } catch {}
    }
    const body = { format: "pulso-cg-profile", version: 2, name: profile.name, exportedAt: new Date().toISOString(), items: data.items, library: data.library, presets: state.presets, assets };
    const filename = `pulso-${profile.name.normalize("NFD").replace(/[^\w-]+/g, "-").toLowerCase()}.json`;
    res.writeHead(200, { "Content-Type": mimeTypes[".json"], "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" });
    return res.end(JSON.stringify(body, null, 2));
  }

  if (req.method === "GET" && url.pathname === "/api/logo") return json(res, 200, logoMeta);

  // Copia de seguridad completa: todos los perfiles con sus escudos en un archivo.
  if (req.method === "GET" && url.pathname === "/api/export-all") {
    const profiles = [];
    for (const profile of state.profiles) {
      const data = profile.id === state.activeProfile ? state : state.profileData[profile.id];
      const assets = {};
      for (const assetId of assetIdsOf(data.items)) {
        try { assets[assetId] = (await readFile(path.join(assetsDir, assetId))).toString("base64"); } catch {}
      }
      profiles.push({ format: "pulso-cg-profile", version: 2, name: profile.name, items: data.items, library: data.library, presets: state.presets, assets });
    }
    let channelLogo = null;
    if (logoMeta.exists) { try { channelLogo = { mime: logoMeta.mime, data: (await readFile(customLogoFile)).toString("base64") }; } catch {} }
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    res.writeHead(200, { "Content-Type": mimeTypes[".json"], "Content-Disposition": `attachment; filename="pulso-cg-copia-completa-${stamp}.json"`, "Cache-Control": "no-store" });
    return res.end(JSON.stringify({ format: "pulso-cg-backup", version: 1, exportedAt: new Date().toISOString(), profiles, channelLogo }));
  }

  // Salud del programa (para pruebas de estrés y diagnóstico).
  if (req.method === "GET" && url.pathname === "/api/health") {
    const memory = process.memoryUsage();
    return json(res, 200, { ok: true, uptime: process.uptime(), rssMB: Math.round(memory.rss / 1e6), heapMB: Math.round(memory.heapUsed / 1e6), clients: clients.size, outputs: [...clients.values()].filter(kind => kind === "output").length, revision: state.revision, items: state.items.length });
  }

  if (req.method === "POST" && url.pathname === "/api/simulate") {
    try {
      const body = await readBody(req);
      if (body.stop) { stopSimulation(); return json(res, 200, snapshot()); }
      await startSimulation(String(body.preset), Math.min(50, Math.max(.25, Number(body.speed) || 1)));
      return json(res, 200, snapshot());
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/asset") {
    try {
      const mime = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
      const id = await saveAsset(await readBinary(req, 3_000_000), mime);
      return json(res, 200, { id });
    } catch (error) {
      return json(res, error.message === "payload_too_large" ? 413 : 415, { error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
    const id = url.pathname.slice(8);
    if (!ASSET_PATTERN.test(id)) return json(res, 404, { error: "not_found" });
    try {
      const file = await readFile(path.join(assetsDir, id));
      res.writeHead(200, { "Content-Type": ASSET_MIME[id.split(".").pop()], "Cache-Control": "public, max-age=31536000, immutable" });
      return res.end(file);
    } catch {
      return json(res, 404, { error: "not_found" });
    }
  }

  if (req.method === "GET" && url.pathname === "/brand-logo") {
    if (!logoMeta.exists) return serveStatic(req, res, "/logo.svg");
    try {
      const file = await readFile(customLogoFile);
      res.writeHead(200, { "Content-Type": logoMeta.mime, "Cache-Control": "no-store" });
      res.end(file);
    } catch {
      return json(res, 404, { error: "logo_not_found" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logo") {
    try {
      const mime = String(req.headers["content-type"] || "").split(";")[0].toLowerCase();
      const file = await readBinary(req);
      if (!validImageSignature(file, mime)) return json(res, 415, { error: "unsupported_logo" });
      await writeFile(customLogoFile, file);
      logoMeta = { exists: true, mime, revision: Date.now() };
      await writeFile(logoMetaFile, JSON.stringify(logoMeta, null, 2));
      return json(res, 200, logoMeta);
    } catch (error) {
      return json(res, error.message === "payload_too_large" ? 413 : 400, { error: error.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    // Si se corta, el navegador reintenta a los 2 s (OBS, vMix y el panel).
    res.write("retry: 2000\n\n");
    clients.set(res, url.searchParams.has("probe") ? "probe" : url.searchParams.get("client") === "output" ? "output" : "panel");
    res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
    if (clients.get(res) === "output") broadcast();
    req.on("close", () => {
      const wasOutput = clients.get(res) === "output";
      clients.delete(res);
      if (wasOutput) broadcast();
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/action") {
    try {
      const action = await readBody(req);
      // Al importar una copia, primero se restauran sus escudos.
      if (action.type === "profile_import" && action.data?.assets && typeof action.data.assets === "object") {
        for (const [assetId, base64] of Object.entries(action.data.assets)) {
          if (!ASSET_PATTERN.test(assetId)) continue;
          const ext = assetId.split(".").pop();
          try { await saveAsset(Buffer.from(String(base64), "base64"), ASSET_MIME[ext]); } catch {}
        }
      }
      const next = applyAction(state, action);
      if (next.error === "validation") return json(res, 422, next);
      if (next.error === "limit") return json(res, 409, next);
      if (next.error) return json(res, 400, next);
      await commit(next);
      return json(res, 200, snapshot());
    } catch (error) {
      return json(res, error.message === "payload_too_large" ? 413 : 400, { error: error.message });
    }
  }

  if (req.method === "GET") return serveStatic(req, res, url.pathname);
  json(res, 405, { error: "method_not_allowed" });
});

/* ── Ensayos en tiempo real ─────────────────────────────────────────── */
// Cada ensayo crea (o renueva) su propio perfil "Ensayo · …": nunca toca los
// perfiles del operador. Se detiene si alguien cambia de perfil.
let simulation = null;

async function startSimulation(presetId, speed = 1) {
  const preset = PROFILE_PRESETS.find(item => item.id === presetId);
  if (!preset) throw new Error("unknown_simulation");
  stopSimulation();
  const name = `Ensayo · ${preset.name}`;
  for (const profile of state.profiles.filter(item => item.name === name)) {
    if (state.profiles.length > 1) await commit(applyAction(state, { type: "profile_delete", id: profile.id }));
  }
  await commit(applyAction(state, { type: "profile_create_preset", preset: preset.id, name }));
  const profileId = state.activeProfile;
  const controller = new AbortController();
  const run = { preset: preset.id, name, label: "Preparando…", index: 0, total: 1, controller };
  simulation = run;
  const dispatch = async action => {
    if (state.activeProfile !== profileId) { controller.abort(); throw new Error("aborted"); }
    const next = applyAction(state, action);
    if (next.error) throw new Error(next.error);
    await commit(next);
    return state;
  };
  runSimulation({ preset: preset.id, dispatch, state: () => state, speed, signal: controller.signal, onStep: step => { Object.assign(run, step); broadcast(); } })
    .catch(error => { if (error.message !== "aborted") console.error("Ensayo detenido:", error.message); })
    .finally(() => { if (simulation === run) { simulation = null; broadcast(); } });
  return run;
}

function stopSimulation() {
  if (!simulation) return;
  simulation.controller.abort();
  simulation = null;
  broadcast();
}

function openBrowser(url) {
  const command = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try { spawn(command[0], command[1], { stdio: "ignore", detached: true }).unref(); } catch {}
}

// La app de escritorio importa este módulo y espera `ready`.
let resolveReady, rejectReady;
export const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
export const info = { port, dataDir, url: `http://localhost:${port}`, version: appVersion };
const embedded = Boolean(process.env.PULSO_EMBEDDED);

server.on("error", error => {
  if (error.code === "EADDRINUSE" && embedded) { resolveReady({ ...info, alreadyRunning: true }); return; }
  if (embedded) { rejectReady(error); return; }
  if (error.code === "EADDRINUSE") {
    console.log(`\nPulso CG ya está abierto en este equipo (puerto ${port}).`);
    console.log(`Abre http://localhost:${port} en el navegador.\n`);
    if (process.argv.includes("--open")) openBrowser(`http://localhost:${port}`);
    process.exit(0);
  }
  throw error;
});

// Sin dirección fija: escucha en IPv4 e IPv6 a la vez. Algunos OBS (sobre
// todo en Windows) resuelven "localhost" como ::1 y con solo IPv4 no conectan.
server.listen(port, () => {
  resolveReady({ ...info, alreadyRunning: false });
  console.log("");
  console.log(`  Datos guardados en: ${dataDir}`);
  console.log("  Pulso CG está funcionando. No cierres esta ventana.");
  console.log("");
  console.log(`  Panel:              http://localhost:${port}`);
  console.log(`  OBS / vMix:         http://localhost:${port}/output`);
  for (const address of lanAddresses()) console.log(`  Desde otro equipo:  http://${address}:${port}/output`);
  console.log("");
  if (process.argv.includes("--open")) openBrowser(`http://localhost:${port}`);
});
