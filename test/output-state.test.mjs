import test from 'node:test';
import assert from 'node:assert/strict';
import { outputState } from '../src/output-state.mjs';
test('salida OBS: omite biblioteca, perfiles y gráficos ocultos; mantiene las salidas en animación', () => {
  const state = { revision: 8, library: [{ secreto: 'no se necesita' }], profiles: [1, 2], items: [{ id: 'a', onAir: false }, { id: 'b', onAir: true, phase: 'live' }, { id: 'c', onAir: true, phase: 'exiting' }] };
  const server = { boot: 'nuevo', now: 100, version: '2.2.2', activity: [], dataDir: '/datos' };
  const out = outputState(state, server);
  assert.deepEqual(out.items.map(i => i.id), ['b', 'c']);assert.equal(out.library, undefined);assert.equal(out.profiles, undefined);assert.equal(out.server.dataDir, undefined);
  assert.equal(outputState(state, server, { preview: true }).items.length, 3);
  assert.equal(state.items.length, 3);
});
