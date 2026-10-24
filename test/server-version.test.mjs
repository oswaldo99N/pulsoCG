import test from 'node:test';
import assert from 'node:assert/strict';
import { assertServerVersion } from '../electron/server-version.mjs';

test('arranque: admite únicamente un servidor Pulso CG de la misma versión', () => {
  assert.doesNotThrow(() => assertServerVersion({ application: 'pulso-cg', version: '2.2.1' }, '2.2.1', 4173));
  for (const health of [{ ok: true }, { application: 'pulso-cg', version: '2.0.0' }, { application: 'otro-programa', version: '2.2.1' }, null]) {
    assert.throws(() => assertServerVersion(health, '2.2.1', 4173), /No se cargará la interfaz antigua/);
  }
});
