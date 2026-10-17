/**
 * Reads one thing from a photo, once — the half of the AI path `check:ai` cannot try, because
 * a photo is the reason the app calls a model at all.
 *
 *   node scripts/check-vision.mjs path/to/pack.jpg [pack|report]
 *
 * `pack` (the default) reads a medicine. `report` reads a printed lab report and prints every
 * result on it, with the range it was measured against and the line on what it means. Both run
 * the app's own `readMedicine` / `readReport`, so the request, the parsing and the error
 * sentences are the app's own. `.env` is read the way Expo reads it; the key itself is never
 * printed.
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 */
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parseEnv } from 'node:util';

import { readMedicine, readReport } from '../src/data/ai.ts';

const [path, mode = 'pack'] = process.argv.slice(2);

if (!path || !['pack', 'report'].includes(mode)) {
  console.error('usage: node scripts/check-vision.mjs <photo.jpg> [pack|report]');
  process.exit(2);
}

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const type = TYPES[extname(path).toLowerCase()];

if (!type) {
  console.error(`unsupported photo type: ${extname(path)} — use jpg, png or webp.`);
  process.exit(2);
}

let source;
let image;

try {
  source = readFileSync('.env', 'utf8');
  image = readFileSync(path);
} catch (error) {
  console.error(`${error.message}\nCopy .env.example to .env and fill it in first.`);
  process.exit(1);
}

// Expo reads `.env` with dotenv, which tolerates the byte-order mark a Windows editor can
// leave at the front; Node's own loader does not, so the mark is dropped here as well.
for (const [key, value] of Object.entries(parseEnv(source.replace(/^\uFEFF/, '')))) {
  process.env[key] ??= value;
}

console.log(`endpoint  ${process.env.EXPO_PUBLIC_AI_BASE_URL ?? '(unset)'}`);
console.log(`model     ${process.env.EXPO_PUBLIC_AI_MODEL ?? '(unset)'}`);
console.log(
  `key       ${process.env.EXPO_PUBLIC_AI_API_KEY ? 'set, not printed' : 'none — a local model needs no key'}`,
);
console.log(`photo     ${path} (${type}, ${Math.round(image.length / 1024)}KB)`);
console.log(`reading   a ${mode === 'report' ? 'lab report' : 'medicine pack'}\n`);

const started = Date.now();
const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

try {
  const photo = `data:${type};base64,${image.toString('base64')}`;
  const reading = mode === 'report' ? await readReport({ photo }) : await readMedicine({ photo });

  console.log(`answered in ${seconds()}\n`);
  console.log(JSON.stringify(reading, null, 2));
} catch (error) {
  console.error(`failed in ${seconds()}: ${error.message}`);
  // Leave the exit to Node: pulling the process down while the request's socket is still
  // closing trips a libuv assertion on Windows.
  process.exitCode = 1;
}
