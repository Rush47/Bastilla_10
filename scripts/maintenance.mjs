import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const manifests = ['package.json', 'package-lock.json'];
const mode = process.argv[2] ?? '--check';

if (!['--check', '--apply'].includes(mode) || process.argv.length > 3) {
  console.error('Usage: npm run maintenance [-- --check|--apply]');
  process.exit(2);
}

function run(args) {
  console.log(`\n> npm ${args.join(' ')}`);
  const result = spawnSync(npm, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args[0]} exited with status ${result.status ?? 'unknown'}`);
  }
}

function checkAvailableUpdates() {
  console.log('\n> npm outdated --long');
  const result = spawnSync(npm, ['outdated', '--long', '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status === 0) {
    console.log(result.stdout.trim() || 'All dependencies are current within their declared ranges.');
    return;
  }

  if (result.status === 1) {
    try {
      const outdated = JSON.parse(result.stdout);
      if (outdated && typeof outdated === 'object' && !Array.isArray(outdated)) {
        const compatible = Object.fromEntries(
          Object.entries(outdated).filter(([, versions]) =>
            versions && versions.current !== versions.wanted
          )
        );
        if (Object.keys(compatible).length > 0) {
          console.log(JSON.stringify(compatible, null, 2));
          console.log('In-range updates are available; review them with `npm run maintenance -- --apply`.');
        } else {
          console.log('No updates are available within the declared ranges. Newer out-of-range versions were left unchanged.');
        }
        return;
      }
    } catch {
      // A non-JSON failure is reported below rather than treated as an update list.
    }
  }

  throw new Error(`npm outdated failed: ${(result.stderr || result.stdout || 'registry request failed').trim()}`);
}

function runValidation() {
  run(['audit', '--audit-level=low']);
  run(['test']);
  run(['run', 'lint']);
  run(['run', 'build']);
  run(['run', 'build:server']);
}

if (mode === '--check') {
  try {
    checkAvailableUpdates();
    runValidation();
    console.log('\nMaintenance check passed. No dependency files were changed.');
  } catch (error) {
    console.error(`\nMaintenance check failed: ${error.message}`);
    process.exitCode = 1;
  }
} else {
  const backupDir = mkdtempSync(path.join(tmpdir(), 'svl-maintenance-'));
  for (const file of manifests) {
    copyFileSync(path.join(root, file), path.join(backupDir, file));
  }

  try {
    run(['update']);
    run(['audit', 'fix']);
    runValidation();
    console.log('\nMaintenance completed: compatible dependency updates passed all checks.');
  } catch (error) {
    console.error(`\nMaintenance failed: ${error.message}`);
    console.error('Restoring package manifests and the previous lockfile.');
    try {
      for (const file of manifests) {
        copyFileSync(path.join(backupDir, file), path.join(root, file));
      }
      run(['ci']);
    } catch (restoreError) {
      console.error(`Dependency restore failed: ${restoreError.message}`);
    }
    process.exitCode = 1;
  } finally {
    rmSync(backupDir, { recursive: true, force: true });
  }
}
