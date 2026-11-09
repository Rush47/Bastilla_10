#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const [sourceModules, destinationModules] = process.argv.slice(2);
if (!sourceModules || !destinationModules || !fs.existsSync(sourceModules)) {
  console.error('pack-runtime-node-modules: expected existing source and destination node_modules paths.');
  process.exit(1);
}

const sourceRoot = path.resolve(sourceModules);
const destinationRoot = path.resolve(destinationModules);
const requiredPackages = ['dotenv', 'express', 'vite'];
const visited = new Set();
const target = { os: 'linux', cpu: 'x64', libc: 'glibc' };

function supportsTarget(values, value) {
  if (!Array.isArray(values)) return true;
  return values.includes(value) && !values.includes(`!${value}`);
}

function supportsRuntimeTarget(manifest) {
  return supportsTarget(manifest.os, target.os)
    && supportsTarget(manifest.cpu, target.cpu)
    && supportsTarget(manifest.libc, target.libc);
}

function resolvePackageRoot(name, fromDirectory) {
  let entry;
  try {
    entry = require.resolve(name, { paths: [fromDirectory] });
  } catch (error) {
    return null;
  }

  let directory = path.dirname(entry);
  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, 'package.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.name === name) return { directory, manifest };
    }
    directory = path.dirname(directory);
  }
  return null;
}

function copyPackage(name, fromDirectory, required = false) {
  const resolved = resolvePackageRoot(name, fromDirectory);
  if (!resolved) {
    if (required) throw new Error(`required runtime dependency "${name}" is missing from node_modules`);
    return;
  }
  if (!supportsRuntimeTarget(resolved.manifest)) return;

  const relative = path.relative(sourceRoot, resolved.directory);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`dependency "${name}" resolves outside node_modules`);
  }
  const destination = path.join(destinationRoot, relative);
  const key = resolved.directory;
  if (visited.has(key)) return;
  visited.add(key);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(resolved.directory, destination, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(resolved.directory, source);
      return relativePath === '' || relativePath.split(path.sep)[0] !== 'node_modules';
    },
  });

  const manifest = resolved.manifest;
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies,
  };
  for (const dependency of Object.keys(dependencies)) {
    copyPackage(dependency, resolved.directory);
  }
}

try {
  fs.rmSync(destinationRoot, { recursive: true, force: true });
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const name of requiredPackages) copyPackage(name, sourceRoot, true);
} catch (error) {
  fs.rmSync(destinationRoot, { recursive: true, force: true });
  console.error(`pack-runtime-node-modules: ${error.message}`);
  process.exit(1);
}
