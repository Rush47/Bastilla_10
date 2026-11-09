import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const compose = await readFile(new URL('../bastillaos/vm-gemini-4/compose.yaml', import.meta.url), 'utf8');

test('VM provisioning scripts are removed and compose cannot download, build or launch a guest', async () => {
  for (const file of ['entrypoint.sh', 'Dockerfile', 'compose.kvm.yaml']) {
    await assert.rejects(access(new URL(`../bastillaos/vm-gemini-4/${file}`, import.meta.url)), { code: 'ENOENT' });
  }
  assert.doesNotMatch(compose, /^\s*build:|cloud-localds|qemu-img|curl|ssh-keygen|unless-stopped/m);
  assert.match(compose, /pull_policy: never/);
  assert.match(compose, /profiles: \[manual-vm\]/);
  assert.match(compose, /entrypoint: \["\/bin\/false"\]/);
  assert.match(compose, /restart: "no"/);
  assert.match(compose, /\.\/data:\/data:ro/);
});

test('legacy VM descriptor remains isolated and exposes SSH only on host loopback', () => {
  assert.match(compose, /user: "\$\{VM_UID:-1000\}:\$\{VM_GID:-1000\}"/);
  assert.match(compose, /cap_drop:\s*\n\s+- ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /127\.0\.0\.1:2224:2222/);
});
