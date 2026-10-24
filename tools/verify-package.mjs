// Compara todos los archivos de ejecución con la fuente que se va a publicar.
// Uso: node tools/verify-package.mjs '/ruta/a/Resources/app.asar'
import asar from '@electron/asar';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const archive = process.argv[2];
assert.ok(archive, 'Indica el archivo app.asar');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const packed = JSON.parse(asar.extractFile(archive, 'package.json'));
assert.equal(packed.version, pkg.version, 'La versión empaquetada debe ser la actual');
assert.equal(packed.dependencies['electron-updater'], pkg.dependencies['electron-updater']);
const files = ['server.mjs', 'build/icon.png'];
async function walk(dir) {
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(file);
    else if (!file.endsWith('.map')) files.push(file);
  }
}
for (const dir of ['public', 'src', 'electron']) await walk(dir);
const digest = data => createHash('sha256').update(data).digest('hex');
for (const file of files) assert.equal(digest(asar.extractFile(archive, file)), digest(await readFile(path.join(root, file))), `Archivo desactualizado: ${file}`);
console.log(JSON.stringify({ version: packed.version, filesChecked: files.length, archive, sha256: digest(await readFile(archive)), macSigned: packed.updates?.macSigned }, null, 2));
