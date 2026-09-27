/**
 * Real-browser harness for the audits.
 *
 * No browser is preinstalled here and every download host except the npm
 * registry is unreachable, so Playwright's and Puppeteer's own installers cannot
 * fetch one. `@sparticuz/chromium` instead ships the Chromium binary *inside its
 * npm tarball*, which makes it installable from the registry alone.
 *
 * That build is linked against NSS/NSPR (libnss3, libnspr4, libnssutil3), which
 * are absent here and cannot be apt-installed. The package also ships an
 * `al2023.tar.br` bundle containing exactly those libraries, so we decompress it
 * with Node's built-in brotli and point LD_LIBRARY_PATH at it.
 *
 * `launchOptions()` returns everything puppeteer.launch needs, or throws a clear
 * message if the browser cannot be made available.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIB_DIR = join(ROOT, 'node_modules', '.cache', 'chromium-libs');

/** Decompress bin/al2023.tar.br into `dest` and unpack the libraries it carries. */
function ensureSystemLibs(dest, tarball) {
  const needed = ['libnss3.so', 'libnspr4.so', 'libnssutil3.so'];
  const libDir = join(dest, 'lib');
  if (existsSync(libDir) && needed.every((f) => existsSync(join(libDir, f)))) return dest;

  if (!existsSync(tarball)) throw new Error(`no al2023 bundle at ${tarball}`);
  mkdirSync(dest, { recursive: true });

  const tarPath = join(dest, 'al2023.tar');
  if (!existsSync(tarPath)) {
    const zlib = require('node:zlib');
    writeFileSync(tarPath, zlib.brotliDecompressSync(readFileSync(tarball)));
  }
  execFileSync('tar', ['xf', tarPath, '-C', dest]);
  const got = readdirSync(libDir).filter((f) => f.endsWith('.so'));
  if (!got.length) throw new Error('al2023 bundle contained no libraries');
  return dest;
}

/**
 * @returns {Promise<{executablePath: string, args: string[], env: object, version: string}>}
 */
export async function launchOptions() {
  let chromium;
  try {
    chromium = (await import('@sparticuz/chromium')).default;
  } catch {
    throw new Error('@sparticuz/chromium is not installed — run `npm install` (it is a devDependency)');
  }

  const executablePath = await chromium.executablePath();
  if (!executablePath || !existsSync(executablePath)) throw new Error('chromium binary did not extract');

  /* The binary needs NSS/NSPR. Supply them from the package's own bundle rather
     than assuming the host has them. */
  const pkgBin = join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin');
  let env = { ...process.env };
  try {
    const extracted = ensureSystemLibs(LIB_DIR, join(pkgBin, 'al2023.tar.br'));
    env.LD_LIBRARY_PATH = [join(extracted, 'lib'), env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  } catch (err) {
    throw new Error(`chromium extracted to ${executablePath} but its NSS libraries could not be prepared: ${err.message}`);
  }

  /* `--single-process` is in the package defaults and is unstable for driving a
     real page; drop it and let Chromium use its normal process model. */
  const args = chromium.args.filter((a) => a !== '--single-process');

  return { executablePath, args, env, headless: true };
}
