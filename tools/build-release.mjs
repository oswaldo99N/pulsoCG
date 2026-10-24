import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const require = createRequire(import.meta.url);
const { build, Platform, Arch } = require('electron-builder');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const config = structuredClone(pkg.build);
config.directories.output = `dist/${pkg.version}`;
if (!['darwin', 'win32'].includes(process.platform)) throw new Error('Genera instaladores en un runner macOS o Windows.');
let macSigned = false;
if (process.platform === 'darwin') {
  macSigned = Boolean(process.env.CSC_LINK);
  if (process.env.PULSO_MAC_REQUIRE_SIGNING === 'true' && !macSigned) throw new Error('Configura MAC_CSC_LINK y MAC_CSC_KEY_PASSWORD en los secrets de GitHub antes de publicar Mac.');
  if (macSigned) {
    if (![process.env.APPLE_ID, process.env.APPLE_APP_SPECIFIC_PASSWORD, process.env.APPLE_TEAM_ID].every(Boolean)) throw new Error('Faltan APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD o APPLE_TEAM_ID para notarizar Mac.');
    delete config.mac.identity;
    config.forceCodeSigning = true;
    config.mac.type = "distribution";
    config.mac.notarize = true;
    config.mac.hardenedRuntime = true;
    config.mac.entitlements = 'build/entitlements.mac.plist';
    config.mac.entitlementsInherit = 'build/entitlements.mac.plist';
  }
}
config.extraMetadata = { updates: { macSigned } };
const targets = process.platform === 'darwin' ? Platform.MAC.createTarget(['dmg', 'zip'], Arch.arm64, Arch.x64) : Platform.WINDOWS.createTarget(['nsis'], Arch.x64);
await build({ targets, config, publish: 'never' });
const archives = process.platform === 'darwin'
  ? ['mac-arm64/Pulso CG.app/Contents/Resources/app.asar', 'mac/Pulso CG.app/Contents/Resources/app.asar']
  : ['win-unpacked/resources/app.asar'];
for (const archive of archives) {
  const result = await promisify(execFile)(process.execPath, ['tools/verify-package.mjs', `${config.directories.output}/${archive}`]);
  process.stdout.write(result.stdout);
}
