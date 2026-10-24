import { ipcMain, Notification, dialog, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createUpdateController, RELEASES_URL } from './update-controller.mjs';

export async function setupUpdates({ app, getWindow, getServerInfo, beforeInstall, onInstallError }) {
  const pkg = JSON.parse(await readFile(path.join(app.getAppPath(), 'package.json'), 'utf8'));
  const cachePath = path.join(app.getPath('userData'), 'update-status.json');
  let cache = {};
  try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch {}
  let persisted = JSON.stringify(cache), writing = Promise.resolve();
  const windowNow = () => { const win = getWindow(); return win && !win.isDestroyed() ? win : null; };
  const emit = state => {
    windowNow()?.webContents.send('pulso:updates:changed', state);
    if (!['available', 'current'].includes(state.status)) return;
    const data = JSON.stringify({ version: state.version, etag: cache.etag, releaseTag: cache.releaseTag });
    if (data === persisted) return;
    persisted = data;
    writing = writing.then(async () => { await writeFile(`${cachePath}.tmp`, data); await rename(`${cachePath}.tmp`, cachePath); }).catch(() => {});
  };
  let lastNotified = null;
  const openPanel = () => { const win = windowNow(); if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); win.webContents.send('pulso:updates:open'); } };
  const controller = createUpdateController({
    updater: electronUpdater.autoUpdater, currentVersion: app.getVersion(), platform: process.platform,
    isPackaged: app.isPackaged, macSigned: pkg.updates?.macSigned === true, knownVersion: cache.version,
    fetchLatestRelease: async () => {
      const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Pulso-CG-Updater' };
      if (cache.etag && cache.releaseTag) headers['If-None-Match'] = cache.etag;
      const response = await fetch('https://api.github.com/repos/oswaldo99N/pulsoCG/releases/latest', { headers, signal: AbortSignal.timeout(15000) });
      if (response.status === 304) return { tag_name: cache.releaseTag };
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('release_unavailable');
      const release = await response.json(); cache.etag = response.headers.get('etag'); cache.releaseTag = release.tag_name;
      return release;
    },
    checkDownloadAllowed: async () => {
      const info = getServerInfo();
      const response = await fetch(`${info.url}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('health_unavailable');
      if (!(await response.json()).outputs) return { ok: true };
      const options = { type: 'warning', buttons: ['Descargar ahora', 'Más tarde'], defaultId: 1, cancelId: 1, message: 'Hay una salida OBS/vMix conectada', detail: 'Descargar el instalador consume Internet y puede competir con tu transmisión. Puedes dejar la actualización para cuando termines.' };
      const win = windowNow();
      const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
      return { ok: result.response === 0, message: 'La actualización sigue disponible. Puedes descargarla al terminar la transmisión.' };
    },
    checkInstallAllowed: async () => {
      const info = getServerInfo();
      if (info?.alreadyRunning) return { ok: false, message: 'Esta ventana está conectada a otra instancia. Cierra esa instancia y vuelve a abrir Pulso CG antes de actualizar.' };
      const win = windowNow();
      if (!win) return { ok: false, message: 'Abre el panel antes de instalar.' };
      const pending = await win.webContents.executeJavaScript('(()=>{try{return JSON.parse(sessionStorage.getItem("pulso-drafts")||"[]").length>0}catch{return false}})()');
      if (pending) return { ok: false, message: 'Hay cambios sin guardar. Guarda o descarta tus borradores antes de actualizar.' };
      const response = await fetch(`${info.url}/api/state`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('state_unavailable');
      const state = await response.json();
      if (state.items.some(item => item.onAir)) return { ok: false, message: 'Hay gráficos al aire. Ocúltalos y termina la emisión antes de instalar la actualización.' };
      return { ok: true };
    },
    confirmInstall: async () => {
      const options = { type: 'question', buttons: ['Reiniciar y actualizar', 'Más tarde'], defaultId: 1, cancelId: 1, message: '¿Instalar la actualización?', detail: 'Pulso CG se cerrará y volverá a abrirse. Tus perfiles y logos permanecen guardados.' };
      const win = windowNow();
      const result = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
      return result.response === 0;
    }, beforeInstall, onInstallError, onStatus: emit,
    onAvailable: state => {
      if (lastNotified === state.version) return;
      lastNotified = state.version;
      if (Notification.isSupported()) {
        const notification = new Notification({ title: 'Actualización de Pulso CG', body: `La versión ${state.version} está disponible. Puedes descargarla desde la app.`, silent: true });
        notification.on('click', openPanel); notification.show();
      }
    }
  });
  const trusted = event => { const win = windowNow(); return win && event.sender === win.webContents && event.senderFrame === win.webContents.mainFrame && new URL(event.senderFrame.url).origin === new URL(getServerInfo().url).origin; };
  const handle = (channel, fn) => ipcMain.handle(channel, (event) => { if (!trusted(event)) throw new Error('Origen no autorizado'); return fn(); });
  handle('pulso:updates:status', controller.getStatus);
  handle('pulso:updates:check', controller.check);
  handle('pulso:updates:download', controller.download);
  handle('pulso:updates:install', controller.install);
  handle('pulso:updates:release', () => shell.openExternal(RELEASES_URL));
  let lastAutomatic = Date.now();
  const automaticCheck = () => { lastAutomatic = Date.now(); return controller.check(); };
  const onFocus = () => { if (Date.now() - lastAutomatic >= 30 * 60 * 1000) automaticCheck(); };
  app.on('browser-window-focus', onFocus);
  const firstCheck = setTimeout(automaticCheck, 20000); firstCheck.unref();
  const repeatedCheck = setInterval(automaticCheck, 30 * 60 * 1000); repeatedCheck.unref();
  app.once('before-quit', () => { clearTimeout(firstCheck); clearInterval(repeatedCheck); app.removeListener('browser-window-focus', onFocus); controller.dispose(); });
  return { openPanel, check: () => { openPanel(); return controller.check(); } };
}
