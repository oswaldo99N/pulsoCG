export function setupUpdateUI() {
  const api = window.pulsoUpdates;
  if (!api) return;
  const button = document.querySelector('#updatesButton'), modal = document.querySelector('#updatesDialog');
  const primary = document.querySelector('#updateAction'), check = document.querySelector('#updateCheck');
  let latest = null;
  const show = () => { if (!modal.open) modal.showModal(); };
  const render = state => {
    latest = state;
    document.querySelector('#updateVersion').textContent = `Versión instalada: ${state.currentVersion}`;
    document.querySelector('#updateMessage').textContent = state.message;
    const pending = Boolean(state.version) && ['available', 'checking', 'download-confirmation', 'downloading', 'ready'].includes(state.status);
    button.classList.toggle('has-update', pending);
    button.querySelector('span').textContent = pending ? `Actualización ${state.version} disponible` : 'Actualizaciones';
    button.title = pending ? `Nueva versión ${state.version} disponible. Pulsa para actualizar.` : 'Buscar actualizaciones';
    const progress = document.querySelector('#updateProgress');
    progress.hidden = state.status !== 'downloading'; progress.value = state.percent;
    document.querySelector('#updateNextVersion').textContent = state.version ? `Nueva versión: ${state.version}` : '';
    primary.hidden = !['available', 'ready'].includes(state.status);
    primary.disabled = false;
    primary.textContent = state.status === 'ready' ? 'Reiniciar y actualizar' : state.manual ? 'Abrir descarga para Mac' : 'Descargar actualización';
    check.disabled = ['checking', 'download-confirmation', 'downloading', 'ready', 'installing', 'development'].includes(state.status);
    document.querySelector('#updateManual').hidden = !state.manual;
  };
  const request = async fn => { try { render(await fn()); } catch { document.querySelector('#updateMessage').textContent = 'No se pudo completar la operación. Vuelve a intentarlo.'; } };
  button.hidden = false;
  button.addEventListener('click', () => { show(); request(api.getStatus); });
  check.addEventListener('click', () => request(api.check));
  primary.addEventListener('click', () => {
    primary.disabled = true;
    if (latest?.manual) { api.openRelease().finally(() => { primary.disabled = false; }); return; }
    request(latest?.status === 'ready' ? api.install : api.download);
  });
  document.querySelector('#updateReleases').addEventListener('click', () => api.openRelease());
  api.onStatus(render); api.onOpen(show);
  request(api.getStatus);
}
