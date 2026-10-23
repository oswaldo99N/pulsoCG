import { ipcMain, Notification, dialog, shell } from 'electron';
import electronUpdater from 'electron-updater';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createUpdateController, RELEASES_URL } from './update-controller.mjs';

export async function setupUpdates({ app, getWindow, getServerInfo, beforeInstall, onInstallError }) {
  const pkg = JSON.parse(await readFile(path.join(app.getAppPath(), 'package.json'), 'utf8'));
  const windowNow = () => { const win = getWindow(); return win && !win.isDestroyed() ? win : null; };
  const emit = state => windowNow()?.webContents.send('pulso:updates:changed', state);
  let lastNotified = null;
  const openPanel = () => { const win = windowNow(); if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); win.webContents.send('pulso:updates:open'); } };
  const controller = createUpdateController({
    updater: electronUpdater.autoUpdater, currentVersion: app.getVersion(), platform: process.platform,
    isPackaged: app.isPackaged, macSigned: pkg.updates?.macSigned === true,
    fetchLatestRelease: async () => {
      const response = await fetch('https://api.github.com/repos/oswaldo99N/pulsoCG/releases/latest', { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Pulso-CG-Updater' }, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('release_unavailable');
      return response.json();
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
  const firstCheck = setTimeout(() => controller.check(), 20000); firstCheck.unref();
  const repeatedCheck = setInterval(() => controller.check(), 6 * 60 * 60 * 1000); repeatedCheck.unref();
  app.once('before-quit', () => { clearTimeout(firstCheck); clearInterval(repeatedCheck); controller.dispose(); });
  return { openPanel, check: () => { openPanel(); return controller.check(); } };
}
