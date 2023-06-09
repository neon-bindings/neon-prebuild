#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const child = require('child_process');
const readline = require('readline');

// FIXME: more opts:
// - --crate-name <crate>
// - --package <package>
// - --crate-type <type>
function parseArgs() {
  const [ _node, _script, ...args ] = process.argv;

  let fromCross = false;
  let outfile = null;
  let crateName = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--from-cross") {
      fromCross = true;
      continue;
    }

    if (outfile) {
      throw new Error("too many arguments");
    }

    outfile = args[i];
  }

  if (!outfile) {
    outfile = "index.node";
  }

  if (!crateName) {
    crateName = require(path.join(process.cwd(), "package.json")).name;
  }

  return { fromCross, outfile, crateName };
}

function usage() {
  console.error("usage: neon-dist [options] [<outfile>]");
  console.error("  --from-cross  normalize paths from cross-rs output");
  console.error("  <outfile>     output file to copy artifact to (default: index.node)");
}

function die(msg) {
  usage();
  console.error();
  console.error(msg);
  process.exit(1);
}

function normalize(abs) {
  console.error("spawning cross metadata for normalization");
  const result = child.spawnSync("cross", ["metadata", "--format-version=1", "--no-deps"], { shell: true });
  console.error("child process complete.");
  const metadata = JSON.parse(result.stdout);
  console.error("metadata:");
  console.error(metadata);
  const rel = path.relative(path.dirname(metadata.target_directory), abs);
  console.error(`absolute path: ${abs}`);
  console.error(`relativized path: ${rel}`);
  return rel;
}

function processEvent(event, opts) {
  const index = event.target.crate_types.indexOf('cdylib');
  if (index < 0) {
    die(`no library artifact found for ${opts.crateName}`);
  }

  const abs = event.filenames[index];

  console.error(`manifest_path=${event.manifest_path}`);
  console.error(`dirname(manifest_path)=${path.dirname(event.manifest_path)}`);
  console.error(`abs=${abs}`);

  const filename = opts.fromCross ? normalize(abs) : abs;

  // FIXME: needs all the logic of cargo-cp-artifact (timestamp check, M1 workaround, async, errors)
  fs.copyFileSync(filename, opts.outfile);
}

function parseLine(line) {
  try {
    const data = JSON.parse(line.trim());
    if ((typeof data === 'object') && ('reason' in data)) {
      return data;
    }
  } catch (ignore) { }
  return null;
}

/*
function processCargoMetadata(metadata, opts) {
  const sub = metadata.find(event => {
    return (event.reason === 'compiler-artifact') &&
      (event.target.name === opts.crateName);
  });

  if (!sub) {
    die(`no artifact created for ${opts.crateName}`);
  }

  const index = sub.target.crate_types.indexOf('cdylib');
  if (index < 0) {
    die(`no library artifact found for ${opts.crateName}`);
  }

  const abs = sub.filenames[index];

  console.error(`manifest_path=${sub.manifest_path}`);
  console.error(`dirname(manifest_path)=${path.dirname(sub.manifest_path)}`);
  console.error(`abs=${abs}`);

  const filename = opts.fromCross ? normalize(abs) : abs;

  // FIXME: needs all the logic of cargo-cp-artifact (timestamp check, M1 workaround, async, errors)
  fs.copyFileSync(filename, opts.outfile);
}
*/

async function go() {
  try {
    console.error("starting up neon-dist");
    const opts = parseArgs();
    console.error("creating stdin stream");
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false
    });
    console.error("created stderr stream");
    for await (const line of rl) {
      console.error("reading a line");
      const event = parseLine(line);
      console.error("read a line");
      if ((event.reason === 'compiler-artifact') && (event.target.name === opts.crateName)) {
        console.error("found the right even, processing");
        processEvent(event, opts);
        console.error("processed event, closing stdin stream");
        break;
      }
    }
    setTimeout(() => {
      rl.terminal = false;
      rl.close();
      console.error("exiting");
      process.stdin.unref();
      process.exit(0);
    }, 0);
  } catch (e) {
    die(e.message);
  }
}

go();

/*
try {
  console.error("starting up neon-dist");
  const opts = parseArgs();
  console.error("creating stdin stream");
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false
  });
  console.error("created stderr stream");
  rl.on('line', line => {
    try {
      console.error("reading a line");
      const event = parseLine(line);
      console.error("read a line");
      if ((event.reason === 'compiler-artifact') && (event.target.name === opts.crateName)) {
        console.error("found the right even, processing");
        processEvent(event, opts);
        console.error("processed event, closing stdin stream");
        rl.close();
        console.error("exiting");
        process.stdin.unref();
        process.exit(0);
      }
    } catch (e) {
      die(e.message);
    }
  });
*/

  /*toString(process.stdin, (err, data) => {
    if (err) {
      die(err.message);
    }

    const metadata = data.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line)
      .map(line => JSON.parse(line));

    processCargoMetadata(metadata, opts);
  });*/
/*} catch (e) {
  die(e.message);
}*/
