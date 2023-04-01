#!/usr/bin/env node

const fs = require('fs');
const child_process = require('child_process');
const temp = require('temp').track();
const path = require('path');

function usage() {
  console.error("usage: neon-prebuild <target> <addon>");
  console.error("  <target> name of target key in neon.prebuilds section of package.json");
  console.error("  <addon>  path to precompiled addon");
}

function die(msg) {
  usage();

  if (msg) {
    console.error();
    console.error(msg);
  }

  process.exit(1);
}

if (process.argv.length !== 4) {
  die();
}

const [ _node, _script, target, addon ] = process.argv;

const manifest = JSON.parse(fs.readFileSync('package.json'));

const version = manifest.version;
const prebuilds = manifest.neon.prebuilds;
const name = prebuilds[target];

if (!name) {
  die(`Rust target ${target} not found in package.json`);
}

const LLVM = require('./llvm.json');
const NODE = require('./node.json');

function lookup(target) {
  const path = LLVM[target];
  if (!path) {
    die(`Rust target ${target} not supported`);
  }
  const [platform, arch, abi] = path;
  return NODE[platform][arch][abi];
}

const targetInfo = lookup(target);

let prebuildManifest = {
  name,
  description: `Prebuilt binary package for ${manifest.name}.`,
  version,
  os: [targetInfo.platform],
  cpu: [targetInfo.arch],
  main: "index.node",
  files: ["index.node"]
};

const OPTIONAL_KEYS = [
  'author', 'repository', 'keywords', 'bugs', 'homepage', 'license', 'engines'
];

for (const key of OPTIONAL_KEYS) {
  if (manifest[key]) {
    prebuildManifest[key] = manifest[key];
  }
}

const tmpdir = temp.mkdirSync('neon-');

fs.writeFileSync(path.join(tmpdir, "package.json"), JSON.stringify(prebuildManifest, null, 2));
fs.copyFileSync(addon, path.join(tmpdir, "index.node"));

const result = child_process.spawnSync("npm", ["pack", "--json"], {
  shell: true,
  cwd: tmpdir,
  stdio: ['pipe', 'pipe', 'inherit']
});

if (result.status !== 0) {
  process.exit(result.status);
}

// FIXME: comment linking to the npm issue this fixes
const tarball = JSON.parse(result.stdout)[0].filename.replace('@', '').replace('/', '-');

fs.renameSync(path.join(tmpdir, tarball), path.join(process.cwd(), tarball));

console.log(tarball);
