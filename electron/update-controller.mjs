export const RELEASES_URL = 'https://github.com/oswaldo99N/pulsoCG/releases/latest';

export function isNewerVersion(candidate, current) {
  const parse = value => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value))?.slice(1).map(Number);
  const next = parse(candidate), old = parse(current);
  if (!next || !old) return false;
  for (let i = 0; i < 3; i++) if (next[i] !== old[i]) return next[i] > old[i];
  return false;
}

export function createUpdateController({ updater, currentVersion, platform, isPackaged, macSigned = false,
  fetchLatestRelease, checkInstallAllowed = async () => ({ ok: true }), confirmInstall = async () => false,
  beforeInstall = () => {}, onInstallError = () => {}, onStatus = () => {}, onAvailable = () => {} }) {
  const manual = platform === 'darwin' && !macSigned;
  const supported = isPackaged && ['win32', 'darwin'].includes(platform);
  let state = { status: supported ? 'idle' : 'development', currentVersion, version: null, percent: 0, manual,
    message: supported ? 'Pulsa Buscar actualizaciones.' : 'Las actualizaciones se usan desde la aplicación instalada.' };
  let checking = false;
  let installing = false;
  const set = patch => { state = { ...state, ...patch }; onStatus({ ...state }); return { ...state }; };
  const fail = () => set({ status: 'error', message: 'No se pudo consultar o descargar la actualización. Comprueba Internet y vuelve a intentarlo.' });
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  const available = info => {
    if (!isNewerVersion(info.version, currentVersion)) return;
    set({ status: 'available', version: info.version.replace(/^v/, ''), message: manual ? 'Hay una versión nueva. Abre la descarga para instalarla.' : 'Hay una versión nueva disponible para descargar.' });
    onAvailable({ ...state });
  };
  const handlers = {
    'update-available': available,
    'update-not-available': () => set({ status: 'current', message: 'Tienes la versión más reciente.' }),
    'download-progress': progress => set({ status: 'downloading', percent: Math.max(0, Math.min(100, Number(progress.percent) || 0)), message: 'Descargando actualización…' }),
    'update-downloaded': info => set({ status: 'ready', version: info.version, percent: 100, message: 'Descarga lista. Instala cuando hayas terminado de emitir.' }),
    'error': fail
  };
  for (const [event, listener] of Object.entries(handlers)) updater.on(event, listener);
  return {
    getStatus: () => ({ ...state }),
    async check() {
      if (!supported || checking || ['downloading', 'ready', 'installing'].includes(state.status)) return { ...state };
      checking = true;
      set({ status: 'checking', message: 'Buscando actualizaciones…' });
      try {
        if (manual) {
          const release = await fetchLatestRelease();
          if (release && isNewerVersion(release.tag_name, currentVersion)) available({ version: release.tag_name });
          else set({ status: 'current', message: release ? 'Tienes la versión más reciente.' : 'Todavía no hay versiones publicadas en GitHub.' });
        } else await updater.checkForUpdates();
      } catch { fail(); }
      finally { checking = false; }
      return { ...state };
    },
    async download() {
      if (!supported || manual || state.status !== 'available') return { ...state };
      set({ status: 'downloading', percent: 0, message: 'Descargando actualización…' });
      try { await updater.downloadUpdate(); } catch { fail(); }
      return { ...state };
    },
    async install() {
      if (!supported || manual || installing || state.status !== 'ready') return { ...state };
      installing = true;
      try {
        const allowed = await checkInstallAllowed();
        if (!allowed.ok) return set({ message: allowed.message });
        if (!await confirmInstall()) return { ...state };
        set({ status: 'installing', message: 'Cerrando Pulso CG para instalar la actualización…' });
        beforeInstall();
        updater.quitAndInstall(false, true);
      } catch { onInstallError(); set({ status: 'ready', message: 'No se pudo iniciar la instalación. Puedes volver a intentarlo.' }); }
      finally { installing = false; }
      return { ...state };
    },
    dispose() { for (const [event, listener] of Object.entries(handlers)) updater.removeListener(event, listener); }
  };
}
