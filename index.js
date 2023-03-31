const fs = require('fs');
const path = require('path');

function abi() {
  return process.report.getReport().header.glibcVersionRuntime ? 'gnu' : 'musl';
}

function target() {
  switch (process.platform) {
    case 'win32':
      return `win32-${process.arch}-msvc`;
    case 'darwin':
      return `darwin-${process.arch}`;
    case 'linux':
      return `linux-${process.arch}-${abi()}`;
    default:
      throw new Error(`Neon: unsupported platform ${process.platform}`);
  }
}

exports.target = target;

function debug(dirname) {
  const m = path.join(dirname, "debug.node");
  return fs.existsSync(m) ? require(m) : null;
}

exports.debug = debug;
