import { spawn } from 'node:child_process';

// These checks write to separate outputs and can safely run concurrently.
const checks = ['test', 'lint', 'build', 'build:server'];
const results = await Promise.all(checks.map(name => new Promise(resolve => {
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', name], {
    stdio: 'inherit', shell: false,
  });
  child.once('error', error => { console.error(`[${name}] ${error.message}`); resolve({ name, ok: false }); });
  child.once('close', code => resolve({ name, ok: code === 0 }));
})));
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}`);
process.exitCode = results.every(result => result.ok) ? 0 : 1;
