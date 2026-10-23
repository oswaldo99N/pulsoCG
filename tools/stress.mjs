// Prueba de estrés de Pulso CG.
// Levanta un servidor propio (puerto y carpeta de datos temporales), conecta
// muchas salidas como si fueran OBS/vMix, ejecuta los ensayos de todos los
// perfiles a alta velocidad, dispara miles de acciones en paralelo y verifica
// que todo llegue, que nada falle y que los datos sobrevivan a un reinicio.
// Uso: ./start.sh stress   (o: node tools/stress.mjs)
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUTS = Number(process.env.OUTPUTS) || 40;
const PANELS = 5;
const WORKERS = Number(process.env.WORKERS) || 20;
const ACTIONS_PER_WORKER = Number(process.env.ACTIONS) || 150;
const port = 4300 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const dataDir = await mkdtemp(path.join(os.tmpdir(), "pulso-stress-"));
const results = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`); };

function startServer() {
  const child = spawn(process.execPath, ["server.mjs"], { cwd: root, env: { ...process.env, PULSO_DATA: dataDir, PULSO_PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  child.stderrText = "";
  child.stderr.on("data", chunk => { child.stderrText += chunk; });
  return child;
}
async function waitReady() {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${base}/api/health`)).ok) return; } catch {} await sleep(100); }
  throw new Error("El servidor no arrancó");
}
const getJson = async url => (await fetch(base + url)).json();
async function act(body) {
  const started = performance.now();
  const response = await fetch(`${base}/api/action`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  return { status: response.status, data, ms: performance.now() - started };
}

// Cliente SSE que recuerda la última revisión recibida.
function connect(kind) {
  const client = { kind, events: 0, revision: -1, controller: new AbortController(), errors: 0 };
  (async () => {
    try {
      const response = await fetch(`${base}/events?client=${kind}`, { signal: client.controller.signal });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0, cut); buffer = buffer.slice(cut + 2);
          const data = block.split("\n").find(line => line.startsWith("data: "));
          if (!data) continue;
          try { client.revision = JSON.parse(data.slice(6)).revision; client.events++; } catch { client.errors++; }
        }
      }
    } catch (error) { if (error.name !== "AbortError") client.errors++; }
  })();
  return client;
}

const percentile = (values, p) => { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0; };

let server = startServer();
try {
  await waitReady();
  const healthStart = await getJson("/api/health");

  // 1 · Conexiones simultáneas (como OBS/vMix en varias computadoras)
  const clients = [...Array.from({ length: OUTPUTS }, () => connect("output")), ...Array.from({ length: PANELS }, () => connect("panel"))];
  await sleep(800);
  const health = await getJson("/api/health");
  check(`${OUTPUTS} salidas y ${PANELS} paneles conectados`, health.outputs === OUTPUTS && health.clients === OUTPUTS + PANELS, `salidas=${health.outputs} clientes=${health.clients}`);

  // 2 · Ensayos completos de cada perfil a velocidad x25
  for (const preset of ["news", "soccer", "basket", "volley"]) {
    const started = performance.now();
    const response = await fetch(`${base}/api/simulate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preset, speed: 25 }) });
    let finished = false, lastLabel = "";
    for (let i = 0; i < 600 && response.ok; i++) {
      const state = await getJson("/api/state");
      if (state.server.simulation) lastLabel = state.server.simulation.label;
      else { finished = true; break; }
      await sleep(100);
    }
    const state = await getJson("/api/state");
    const errors = (server.stderrText.match(/Ensayo detenido/g) ?? []).length;
    const scorebug = state.items.find(item => item.graphic.templateId.endsWith("scorebug"));
    const detail = scorebug ? Object.entries(scorebug.graphic.fields).filter(([key]) => /Score$|Sets$/.test(key)).map(([key, value]) => `${key}=${value}`).join(" ") : `${state.items.length} gráficos`;
    check(`Ensayo «${preset}» completo sin errores`, response.ok && finished && errors === 0, `${((performance.now() - started) / 1000).toFixed(1)} s · ${detail}${lastLabel ? ` · último paso: ${lastLabel}` : ""}`);
  }

  // 3 · Ráfaga: muchos operadores a la vez sobre un perfil de fútbol
  await act({ type: "profile_create_preset", preset: "soccer", name: "Estrés" });
  const ids = (await getJson("/api/state")).items.map(item => item.id);
  const latencies = [], statuses = {};
  let seed = 7;
  const random = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const worker = async () => {
    for (let i = 0; i < ACTIONS_PER_WORKER; i++) {
      const state = await getJson("/api/state");
      const item = state.items[random(state.items.length)];
      const kind = random(6);
      let body;
      if (kind === 0) body = { type: "item_show", id: item.id };
      else if (kind === 1) body = { type: "item_hide", id: item.id };
      else if (kind === 2 && item.timers && Object.keys(item.timers).length) body = { type: "item_timer", id: item.id, key: Object.keys(item.timers)[0], op: ["start", "stop", "toggle"][random(3)] };
      else if (kind === 3) body = { type: "library_save", templateId: "player", fields: { name: `Jugador ${random(500)}`, number: String(random(99)), team: "Estrés FC" } };
      else {
        const fields = { ...item.graphic.fields };
        for (const key of Object.keys(fields)) if (/Score|Points|Fouls/.test(key)) fields[key] = String(random(120));
        body = { type: "item_update", id: item.id, graphic: { ...item.graphic, fields, style: { ...item.graphic.style, x: random(400) - 200 } } };
      }
      const result = await act(body);
      latencies.push(result.ms);
      statuses[result.status] = (statuses[result.status] ?? 0) + 1;
    }
  };
  const burstStart = performance.now();
  await Promise.all(Array.from({ length: WORKERS }, worker));
  const burstSeconds = (performance.now() - burstStart) / 1000;
  const total = WORKERS * ACTIONS_PER_WORKER;
  const unexpected = Object.entries(statuses).filter(([code]) => !["200", "422"].includes(code));
  check(`${total} acciones de ${WORKERS} operadores simultáneos`, unexpected.length === 0, `${Math.round(total / burstSeconds)} acciones/s · p50 ${percentile(latencies, .5).toFixed(1)} ms · p95 ${percentile(latencies, .95).toFixed(1)} ms · p99 ${percentile(latencies, .99).toFixed(1)} ms · respuestas ${JSON.stringify(statuses)}`);

  // 4 · Todas las salidas recibieron el último cambio
  await sleep(1500);
  const final = await getJson("/api/state");
  const behind = clients.filter(client => client.revision !== final.revision);
  check("Todas las salidas quedaron sincronizadas con el último cambio", behind.length === 0 && clients.every(client => client.errors === 0), `revisión ${final.revision} · eventos por salida ≈ ${Math.round(clients.reduce((sum, client) => sum + client.events, 0) / clients.length)}`);
  const healthEnd = await getJson("/api/health");
  check("Memoria estable", healthEnd.rssMB < 400, `${healthStart.rssMB} MB → ${healthEnd.rssMB} MB`);

  // 5 · Escudos: subir, servir, copia de seguridad y restauración
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const upload = await (await fetch(`${base}/api/asset`, { method: "POST", headers: { "Content-Type": "image/png" }, body: png })).json();
  const served = await fetch(`${base}/assets/${upload.id}`);
  const scorebug = final.items.find(item => item.graphic.templateId === "soccer-scorebug");
  await act({ type: "item_update", id: scorebug.id, graphic: { ...scorebug.graphic, fields: { ...scorebug.graphic.fields, homeLogo: upload.id } } });
  const backup = await getJson(`/api/export?profile=${final.activeProfile}`);
  const imported = await act({ type: "profile_import", data: backup });
  const restoredLogo = imported.data.items.find(item => item.graphic.templateId === "soccer-scorebug")?.graphic.fields.homeLogo;
  check("Escudos: subida, copia de seguridad e importación", served.ok && Boolean(backup.assets?.[upload.id]) && restoredLogo === upload.id, `id ${upload.id}`);
  const fake = await fetch(`${base}/api/asset`, { method: "POST", headers: { "Content-Type": "image/png" }, body: "esto no es una imagen" });
  check("Rechaza archivos que no son imágenes", fake.status === 415);

  // 6 · Reinicio: los datos sobreviven y nada vuelve a salir al aire solo
  for (const client of clients) client.controller.abort();
  const before = await getJson("/api/state");
  server.kill("SIGTERM");
  await sleep(500);
  const onDisk = JSON.parse(await readFile(path.join(dataDir, "state.json"), "utf8"));
  check("state.json válido después de la carga", Array.isArray(onDisk.items) && onDisk.profiles.length === before.profiles.length, `${onDisk.profiles.length} perfiles · ${onDisk.items.length} gráficos en el perfil activo`);
  server = startServer();
  await waitReady();
  const after = await getJson("/api/state");
  check("Tras reiniciar: mismos perfiles y gráficos, todo oculto", after.profiles.length === before.profiles.length && after.items.length === before.items.length && after.items.every(item => !item.onAir), `${after.profiles.map(profile => `${profile.name} (${profile.itemCount})`).join(", ")}`);
} catch (error) {
  check("La prueba terminó sin excepciones", false, error.stack);
} finally {
  server.kill("SIGTERM");
  await sleep(300);
  await rm(dataDir, { recursive: true, force: true });
}

const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones correctas`);
process.exit(failed.length ? 1 : 0);
