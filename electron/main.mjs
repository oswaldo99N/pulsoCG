// Pulso CG · aplicación de escritorio (macOS y Windows).
// Arranca el mismo servidor local que usan OBS y vMix y abre el panel en su
// propia ventana. Los datos van a la carpeta estándar del sistema:
//   macOS   ~/Library/Application Support/Pulso CG/data
//   Windows %APPDATA%\Pulso CG\data
import { app, BrowserWindow, Menu, clipboard, dialog, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { setupUpdates } from "./updates.mjs";
import { assertServerVersion } from "./server-version.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
app.setName("Pulso CG");
if (process.platform === "win32") app.setAppUserModelId("com.pulsocg.app");

// Una sola instancia: si se abre otra vez, se enfoca la ventana existente.
const ownsInstance = app.requestSingleInstanceLock();

let win = null;
let info = null;
let quitting = false;
let updates = null;

async function startServer() {
  process.env.PULSO_EMBEDDED = "1";
  const server = await import(pathToFileURL(path.join(root, "server.mjs")).href);
  return server.ready;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1100, minHeight: 700,
    backgroundColor: "#0b0b0d", title: `Pulso CG ${app.getVersion()}`, show: false,
    icon: path.join(root, "build", "icon.png"),
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(root, "electron", "preload.cjs") }
  });
  win.once("ready-to-show", () => win.show());
  win.loadURL(info.url);
  win.on("page-title-updated", event => { event.preventDefault(); win.setTitle(`Pulso CG ${app.getVersion()}`); });

  // Enlaces a otras páginas (p. ej. "Abrir salida") se abren en el navegador.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });

  // Cerrar la ventana apaga el servidor: se avisa porque OBS dejaría de recibir gráficos.
  win.on("close", event => {
    if (quitting) return;
    const choice = dialog.showMessageBoxSync(win, {
      type: "question", buttons: ["Cerrar Pulso CG", "Cancelar"], defaultId: 1, cancelId: 1,
      message: "¿Cerrar Pulso CG?",
      detail: "OBS y vMix dejarán de recibir los gráficos hasta que vuelvas a abrir el programa. Todo queda guardado."
    });
    if (choice === 1) event.preventDefault();
    else quitting = true;
  });
  win.on("closed", () => { win = null; });
}

function buildMenu() {
  const output = `${info.url}/output`;
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu", label: "Pulso CG" }] : []),
    {
      label: "Archivo",
      submenu: [
        { label: "Copiar enlace para OBS en este equipo", accelerator: "CmdOrCtrl+Shift+C", click: () => { clipboard.writeText(output); dialog.showMessageBox(win, { message: "Enlace copiado", detail: `${output}\n\nPégalo en una Fuente de navegador de OBS (1920 × 1080).` }); } },
        { label: "Conectar OBS desde otra computadora…", click: () => win?.webContents.executeJavaScript('document.querySelector("#obsButton")?.click()') },
        { label: "Abrir la salida en el navegador", click: () => shell.openExternal(output) },
        { type: "separator" },
        { label: "Descargar copia de seguridad completa…", click: () => win?.webContents.downloadURL(`${info.url}/api/export-all`) },
        { label: "Abrir carpeta de datos", click: () => shell.openPath(info.dataDir) },
        { type: "separator" },
        process.platform === "darwin" ? { role: "close", label: "Cerrar ventana" } : { role: "quit", label: "Salir" }
      ]
    },
    { label: "Editar", submenu: [{ role: "undo", label: "Deshacer" }, { role: "redo", label: "Rehacer" }, { type: "separator" }, { role: "cut", label: "Cortar" }, { role: "copy", label: "Copiar" }, { role: "paste", label: "Pegar" }, { role: "selectAll", label: "Seleccionar todo" }] },
    { label: "Ver", submenu: [{ role: "reload", label: "Recargar" }, { role: "resetZoom", label: "Tamaño real" }, { role: "zoomIn", label: "Acercar" }, { role: "zoomOut", label: "Alejar" }, { type: "separator" }, { role: "togglefullscreen", label: "Pantalla completa" }, { role: "toggleDevTools", label: "Herramientas de desarrollo" }] },
    { label: "Ayuda", submenu: [{ label: "Cómo se usa", click: () => win?.webContents.executeJavaScript('document.querySelector("#helpButton")?.click()') }, { label: "Buscar actualizaciones…", click: () => updates?.check() }, { label: "Conectar con OBS", click: () => win?.webContents.executeJavaScript('document.querySelector("#obsStatus")?.click()') }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => app.quit());
app.on("activate", () => { if (!win && info) createWindow(); });

app.whenReady().then(async () => {
  if (!ownsInstance) {
    dialog.showMessageBoxSync({ type: "info", message: `Ya hay otra copia de Pulso CG abierta`, detail: `Estás intentando abrir Pulso CG ${app.getVersion()}. Para usar esta versión, cierra primero la otra copia con Cmd+Q en Mac o Salir en Windows, y vuelve a abrirla. Abrir un DMG no reemplaza la app instalada: arrástrala a Aplicaciones y acepta Reemplazar.` });
    app.quit();
    return;
  }
  try {
    info = await startServer();
    if (info.alreadyRunning) {
      const response = await fetch(`${info.url}/api/health`, { signal: AbortSignal.timeout(5000) });
      const running = response.ok ? await response.json() : {};
      assertServerVersion(running, app.getVersion(), info.port);
      dialog.showMessageBoxSync({ type: "info", message: "Pulso CG ya está funcionando", detail: `Esta ventana se conecta al servidor de la misma versión ${running.version}.` });
    }
    updates = await setupUpdates({ app, getWindow: () => win, getServerInfo: () => info, beforeInstall: () => { quitting = true; }, onInstallError: () => { quitting = false; } });
    createWindow();
    buildMenu();
  } catch (error) {
    console.error("No se pudo iniciar Pulso CG:", error?.stack || error);
    dialog.showErrorBox("No se pudo iniciar Pulso CG", String(error?.stack || error));
    app.quit();
  }
});
