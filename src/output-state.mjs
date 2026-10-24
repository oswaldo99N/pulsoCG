// OBS/vMix reciben solo lo necesario para dibujar, sin biblioteca ni perfiles.
export function outputState(state, server, { preview = false } = {}) {
  return {
    revision: state.revision,
    items: state.items.filter(item => preview || item.onAir),
    server: { boot: server.boot, now: server.now, version: server.version }
  };
}
