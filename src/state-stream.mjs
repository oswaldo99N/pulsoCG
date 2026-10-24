// Una salida lenta conserva solo el último estado pendiente, sin acumular
// todos los marcadores intermedios en el buffer del socket.
export function createStateWriter() {
  const waiting = new WeakMap();
  return function writeState(client, message) {
    if (client.destroyed || client.writableEnded) return;
    const pending = waiting.get(client);
    if (pending) { pending.message = message; return; }
    const alreadyBlocked = client.writableNeedDrain;
    if (!alreadyBlocked && client.write(message)) return;
    const slot = { message: alreadyBlocked ? message : null };
    waiting.set(client, slot);
    const cleanup = () => { waiting.delete(client); client.removeListener('drain', drain); client.removeListener('close', cleanup); };
    const drain = () => { const latest = slot.message; cleanup(); if (latest) writeState(client, latest); };
    client.once('drain', drain);
    client.once('close', cleanup);
  };
}
