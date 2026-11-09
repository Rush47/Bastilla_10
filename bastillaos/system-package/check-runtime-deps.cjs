#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const modulesDirectory = process.argv[2];
if (!modulesDirectory || !fs.existsSync(modulesDirectory)) {
  console.error('check-runtime-deps: production node_modules directory is missing.');
  process.exit(1);
}

const resolvedModulesDirectory = path.resolve(modulesDirectory);
const runtimeRequire = createRequire(path.join(path.dirname(resolvedModulesDirectory), 'server.mjs'));
const runtimeDependencies = ['dotenv', 'express', 'vite'];

for (const dependency of runtimeDependencies) {
  try {
    runtimeRequire.resolve(dependency);
  } catch (error) {
    console.error(`check-runtime-deps: runtime dependency "${dependency}" cannot be resolved.`);
    process.exit(1);
  }
}
