import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createStateWriter } from '../src/state-stream.mjs';
class Client extends EventEmitter {
  writableNeedDrain = false; messages = [];
  write(message) { this.messages.push(message); return !this.writableNeedDrain; }
}
test('salida lenta: retiene únicamente el último estado mientras espera al socket', () => {
  const write = createStateWriter(), client = new Client();
  client.writableNeedDrain = true;
  write(client, 'primero'); write(client, 'segundo'); write(client, 'último');
  assert.ok(client.messages.length <= 1);
  client.writableNeedDrain = false; client.emit('drain');
  assert.equal(client.messages.at(-1), 'último'); assert.equal(client.listenerCount('drain'), 0);
});
test('salida normal: todos los estados se envían y cerrar libera la espera', () => {
  const write = createStateWriter(), client = new Client();
  write(client, 'uno'); write(client, 'dos'); assert.deepEqual(client.messages, ['uno', 'dos']);
  client.writableNeedDrain = true; write(client, 'tres'); client.emit('close');
  assert.equal(client.listenerCount('drain'), 0);
  client.destroyed = true; write(client, 'cerrado'); assert.ok(!client.messages.includes('cerrado'));
});
