import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const entrypoint = await readFile(new URL('../bastillaos/vm-gemini-4/entrypoint.sh', import.meta.url), 'utf8');
const compose = await readFile(new URL('../bastillaos/vm-gemini-4/compose.yaml', import.meta.url), 'utf8');

test('VM agent SSH account has no sudo and the old VM disk is preserved', () => {
  assert.match(entrypoint, /DISK_IMAGE="\/data\/vm-gemini-4-restricted\.qcow2"/);
  assert.match(entrypoint, /- name: svl-agent[\s\S]*?sudo: false[\s\S]*?ssh_authorized_keys:/);
  assert.match(entrypoint, /- name: debian[\s\S]*?groups: \[adm\][\s\S]*?sudo: false/);
  assert.match(entrypoint, /usermod, -G, adm, debian/);
  assert.match(entrypoint, /rm, -f, \/etc\/sudoers\.d\/90-cloud-init-users/);
  assert.doesNotMatch(entrypoint, /NOPASSWD|groups: \[[^\]]*\bsudo\b/);
});

test('VM container remains isolated and exposes SSH only on host loopback', () => {
  assert.match(compose, /user: "\$\{VM_UID:-1000\}:\$\{VM_GID:-1000\}"/);
  assert.match(compose, /cap_drop:\s*\n\s+- ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /127\.0\.0\.1:2224:2222/);
});
