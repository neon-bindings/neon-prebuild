#!/usr/bin/env node

const fs = require('fs');
const child_process = require('node:child_process');

const manifest = JSON.parse(fs.readFileSync('./package.json'));
const version = manifest.version;

const prebuilds = Object.values(manifest.neon.prebuilds);
const specs = prebuilds.map(name => `${name}@${version}`);

const result = child_process.spawnSync("npm", ["install", "--save-exact", "-O", ...specs], { shell: true });
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status);
}

const PREAMBLE =
`// AUTOMATICALLY GENERATED FILE. DO NOT EDIT.
//
// This code is never executed but is detected by the static analysis of
// bundlers such as \`@vercel/ncc\`. The require() expression that selects
// the right binary module for the current platform is too dynamic to be
// analyzable by bundler analyses, so this module provides an exhaustive
// static list for those analyses.

return;

`;

const requires = prebuilds.map(name => `require('${name}');`).join('\n');

fs.writeFileSync('./.prebuilds.js', PREAMBLE + requires + '\n');
