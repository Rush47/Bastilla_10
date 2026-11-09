#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`BastillaOS build config: ${message}`);
  process.exit(1);
};

const packageManifest = JSON.parse(read('package.json'));
const expectedBundle = 'bastillaos/build/server.mjs';
const bundleScript = packageManifest.scripts?.['build:server'];

if (!packageManifest.scripts?.build) fail('package.json is missing the frontend build script.');
if (!bundleScript) fail('package.json is missing the build:server script.');
for (const requiredOption of [
  'esbuild server.ts',
  '--bundle',
  '--platform=node',
  '--format=esm',
  '--packages=external',
  `--outfile=${expectedBundle}`,
]) {
  if (!bundleScript.includes(requiredOption)) {
    fail(`build:server must include "${requiredOption}".`);
  }
}

const requiredPaths = [
  'bastillaos/Dockerfile.builder',
  'bastillaos/live-build/auto/config',
  'bastillaos/live-build/config/hooks/live/9999-bastillaos-security.hook.chroot',
  'bastillaos/system-package/build-package.sh',
  'bastillaos/branding/usr/share',
  'bastillaos/security/includes.chroot',
  'apps/without_nlp/engine.py',
  'bastillaos/system-package/bin/without-nlp',
  'bastillaos/branding/usr/share/applications/BastillaOS-without_nlp.desktop',
];
for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`required build input is missing: ${relativePath}`);
  }
}

const isoScript = read('bastillaos/build-iso.sh');
if (!isoScript.includes('npm run build') || !isoScript.includes('npm run build:server')) {
  fail('build-iso.sh must build both the frontend and production server.');
}
if (!isoScript.includes('system-package/build-package.sh')) {
  fail('build-iso.sh must invoke the Debian package builder.');
}
if (!isoScript.includes('BastillaOS-13-amd64.iso')) {
  fail('build-iso.sh ISO output name is inconsistent.');
}

const packageBuilder = read('bastillaos/system-package/build-package.sh');
if (!packageBuilder.includes(expectedBundle)) {
  fail(`system package builder must consume ${expectedBundle}.`);
}

if (!packageBuilder.includes('usr/bin/without-nlp')) {
  fail('system package builder must install the without-nlp system command.');
}

const workflow = read('.github/workflows/build-bastillaos.yml');
if (!workflow.includes('node bastillaos/check-build-config.cjs')) {
  fail('CI workflow must run this static configuration check.');
}
for (const output of [
  'bastillaos/build/BastillaOS-13-amd64.iso',
  'bastillaos/build/BastillaOS-13-amd64.iso.sha256',
]) {
  if (!workflow.includes(output)) fail(`CI artifact path is inconsistent: ${output}`);
}

console.log('BastillaOS build configuration is consistent.');
