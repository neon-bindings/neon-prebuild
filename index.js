const fs = require('fs');
const path = require('path');

function target() {
  let os = null;

  switch (process.platform) {
    case 'android':
      switch (process.arch) {
        case 'arm':
          return 'android-arm-eabi';
        case 'arm64':
          return 'android-arm64';
      }
      os = 'Android';
      break;

    case 'win32':
      switch (process.arch) {
        case 'x64':
          return 'win32-x64-msvc'
        case 'arm64':
          return 'win32-arm64-msvc';
        case 'ia32':
          return 'win32-ia32-msvc';
      }
      os = 'Windows';
      break;

    case 'darwin':
      switch (process.arch) {
        case 'x64':
          return 'darwin-x64';
        case 'arm64':
          return 'darwin-arm64';
      }
      os = 'macOS';
      break;

    case 'linux':
      switch (process.arch) {
        case 'x64':
        case 'arm64':
          return process.report.getReport().header.glibcVersionRuntime
            ? `linux-${process.arch}-gnu`
            : `linux-${process.arch}-musl`;
        case 'arm':
          return 'linux-arm-gnueabihf';
      }
      os = 'Linux';
      break;

    case 'freebsd':
      if (process.arch === 'x64') {
        return 'freebsd-x64';
      }
      os = 'FreeBSD';
      break;
  }

  if (os) {
    throw new Error(`Neon: unsupported ${os} architecture: ${process.arch}`);
  }

  throw new Error(`Neon: unsupported system: ${process.platform}`);
}

exports.target = target;

function debug(dirname) {
  const m = path.join(dirname, "index.node");
  return fs.existsSync(m) ? require(m) : null;
}

exports.debug = debug;
