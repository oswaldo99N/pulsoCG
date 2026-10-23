import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createUpdateController, isNewerVersion } from '../electron/update-controller.mjs';
class Updater extends EventEmitter {
  checks = 0; downloads = 0; installs = 0;
  async checkForUpdates() { this.checks++; this.emit('update-available', { version: '2.3.0' }); }
  async downloadUpdate() { this.downloads++; this.emit('download-progress', { percent: 50 }); this.emit('update-downloaded', { version: '2.3.0' }); }
  quitAndInstall(silent, restart) { assert.equal(silent, false); assert.equal(restart, true); this.installs++; }
}
const make = (options = {}) => { const updater = new Updater(); return { updater, controller: createUpdateController({ updater, currentVersion: '2.2.0', platform: 'win32', isPackaged: true, ...options }) }; };
test('actualizaciones: compara versiones estables numéricamente y no baja de versión', () => {
  assert.ok(isNewerVersion('v2.10.0', '2.9.9'));
  for (const v of ['2.2.0', '2.1.9', '2.3.0-beta.1', 'version falsa']) assert.equal(isNewerVersion(v, '2.2.0'), false);
});
test('actualizaciones: aviso, descarga e instalación requieren acciones separadas', async () => {
  let confirmed = false, before = false;
  const { updater, controller } = make({ confirmInstall: async () => confirmed, beforeInstall: () => { before = true; } });
  await controller.check();
  assert.equal(controller.getStatus().status, 'available'); assert.equal(updater.downloads, 0);
  assert.equal(updater.autoDownload, false); assert.equal(updater.autoInstallOnAppQuit, false);
  await controller.install(); assert.equal(updater.installs, 0);
  await controller.download(); assert.equal(controller.getStatus().status, 'ready'); assert.equal(updater.installs, 0);
  await controller.install(); assert.equal(updater.installs, 0);
  confirmed = true; await controller.install(); assert.equal(updater.installs, 1); assert.equal(before, true);
});
test('actualizaciones: no instala con gráficos al aire o borradores pendientes', async () => {
  let allowed = false;
  const { updater, controller } = make({ checkInstallAllowed: async () => ({ ok: allowed, message: 'Termina la emisión y guarda los cambios.' }), confirmInstall: async () => true });
  await controller.check(); await controller.download(); await controller.install();
  assert.equal(updater.installs, 0); assert.equal(controller.getStatus().status, 'ready'); assert.match(controller.getStatus().message, /emisión/);
  allowed = true; await controller.install(); assert.equal(updater.installs, 1);
});
test('actualizaciones: Mac sin Developer ID ofrece aviso y descarga manual', async () => {
  const { updater, controller } = make({ platform: 'darwin', macSigned: false, fetchLatestRelease: async () => ({ tag_name: 'v2.3.0' }) });
  await controller.check(); assert.equal(controller.getStatus().manual, true); assert.equal(controller.getStatus().status, 'available');
  await controller.download(); await controller.install(); assert.equal(updater.checks, 0); assert.equal(updater.downloads, 0); assert.equal(updater.installs, 0);
});
test('actualizaciones: Mac firmado usa el actualizador integrado', async () => {
  const { updater, controller } = make({ platform: 'darwin', macSigned: true });
  await controller.check(); assert.equal(updater.checks, 1); assert.equal(controller.getStatus().manual, false);
});
test('actualizaciones: un fallo de Internet se informa sin cerrar la app', async () => {
  const { updater, controller } = make(); updater.checkForUpdates = async () => { throw Error('network unavailable'); };
  await controller.check(); assert.equal(controller.getStatus().status, 'error'); assert.equal(updater.installs, 0);
});
test('actualizaciones: desarrollo no consulta ni descarga publicaciones', async () => {
  const { updater, controller } = make({ isPackaged: false });
  await controller.check(); await controller.download(); await controller.install();
  assert.equal(controller.getStatus().status, 'development'); assert.equal(updater.checks, 0); assert.equal(updater.downloads, 0);
});
test('actualizaciones: evita comprobaciones simultáneas', async () => {
  const { updater, controller } = make(); let finish;
  updater.checkForUpdates = async () => { updater.checks++; await new Promise(resolve => { finish = resolve; }); };
  const first = controller.check(); await controller.check(); assert.equal(updater.checks, 1); finish(); await first;
});
test('actualizaciones: cancelar o fallar la comprobación previa conserva la descarga', async () => {
  const { updater, controller } = make({ checkInstallAllowed: async () => { throw Error('servidor no disponible'); }, confirmInstall: async () => true });
  await controller.check(); await controller.download(); await controller.install();
  assert.equal(updater.installs, 0); assert.equal(controller.getStatus().status, 'ready');
});
test('actualizaciones: el estado expuesto no puede alterar el estado interno', () => {
  const { controller } = make(); const copy = controller.getStatus(); copy.status = 'ready';
  assert.equal(controller.getStatus().status, 'idle');
});
