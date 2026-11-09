#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const [repositoryRoot, destinationRoot] = process.argv.slice(2);
if (!repositoryRoot || !destinationRoot) {
  console.error('pack-system-defaults: expected repository and destination directories.');
  process.exit(1);
}

const sourceRoot = path.resolve(repositoryRoot);
const outputRoot = path.resolve(destinationRoot);
const sourceDirectories = [
  'src',
  'apps',
  'bastillaos',
  'Nowy_system',
  'exports',
  '.github/workflows',
];
const sourceFiles = [
  'server.ts',
  'svl_kernel.py',
  'update_kernel.py',
  'package.json',
  'package-lock.json',
  'index.html',
  'README.md',
  'tsconfig.json',
  'vite.config.ts',
  'metadata.json',
];
const excludedDirectoryNames = new Set([
  '.git',
  '.build-work',
  '.test-work',
  '.node-check',
  '.validation-out',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '__pycache__',
]);

function excludedName(name) {
  return excludedDirectoryNames.has(name)
    || name.startsWith('.env')
    || name === '.github_credentials.json'
    || name === 'svl_datastore.json'
    || /secret|credential|private.?key/i.test(name);
}

function copyTree(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  if (!fs.existsSync(source)) return;
  const rootStat = fs.lstatSync(source);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return;

  function copyDirectory(sourceDirectory, destinationDirectory) {
    fs.mkdirSync(destinationDirectory, { recursive: true, mode: 0o755 });
    for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
      if (excludedName(entry.name) || entry.isSymbolicLink()) continue;
      const sourceEntry = path.join(sourceDirectory, entry.name);
      const destinationEntry = path.join(destinationDirectory, entry.name);
      if (entry.isDirectory()) {
        copyDirectory(sourceEntry, destinationEntry);
      } else if (entry.isFile()) {
        fs.mkdirSync(path.dirname(destinationEntry), { recursive: true });
        fs.copyFileSync(sourceEntry, destinationEntry);
        fs.chmodSync(destinationEntry, fs.statSync(sourceEntry).mode & 0o777);
      }
    }
  }

  copyDirectory(source, path.join(outputRoot, relativePath));
}

try {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const relativePath of sourceDirectories) copyTree(relativePath);
  for (const relativePath of sourceFiles) {
    const source = path.join(sourceRoot, relativePath);
    if (!fs.existsSync(source) || excludedName(path.basename(relativePath))) continue;
    const stat = fs.lstatSync(source);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    const destination = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    fs.chmodSync(destination, stat.mode & 0o777);
  }

  const gitignoreSource = path.join(__dirname, 'defaults', 'worktree.gitignore');
  fs.copyFileSync(gitignoreSource, path.join(outputRoot, '.gitignore'));
  fs.chmodSync(path.join(outputRoot, '.gitignore'), 0o644);
} catch (error) {
  console.error(`pack-system-defaults: ${error.message}`);
  process.exit(1);
}
