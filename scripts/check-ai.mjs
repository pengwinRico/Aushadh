/**
 * Asks the configured model to read one medicine, once, and prints what it answered.
 *
 * The same call the add-medicine form makes, without the app — so an endpoint, a key or a
 * model name can be proven before a pack is photographed. `.env` is read the way Expo reads
 * it; the key itself is never printed.
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 *
 *   npm run check:ai            # reads "Paracetamol"
 *   npm run check:ai -- Crocin  # or a name of your own
 */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { readMedicine } from '../src/data/ai.ts';

let source;

try {
  source = readFileSync('.env', 'utf8');
} catch {
  console.error('No .env file. Copy .env.example to .env and fill it in first.');
  process.exit(1);
}

// Expo reads `.env` with dotenv, which tolerates the byte-order mark a Windows editor can
// leave at the front; Node's own loader does not, so the mark is dropped here as well.
for (const [key, value] of Object.entries(parseEnv(source.replace(/^\uFEFF/, '')))) {
  process.env[key] ??= value;
}

const baseUrl = process.env.EXPO_PUBLIC_AI_BASE_URL ?? '(unset)';
const model = process.env.EXPO_PUBLIC_AI_MODEL ?? '(unset)';
const hasKey = Boolean(process.env.EXPO_PUBLIC_AI_API_KEY);
const name = process.argv[2] ?? 'Paracetamol';

console.log(`endpoint  ${baseUrl}`);
console.log(`model     ${model}`);
console.log(`key       ${hasKey ? 'set, not printed' : 'none'}`);
console.log(`asked     "${name}"\n`);

const started = Date.now();
const seconds = () => `${((Date.now() - started) / 1000).toFixed(1)}s`;

try {
  const reading = await readMedicine({ name, groups: ['Fever & Pain', 'Antibiotics'] });

  console.log(`answered in ${seconds()}\n`);
  console.log(JSON.stringify(reading, null, 2));
} catch (error) {
  console.error(`failed in ${seconds()}: ${error.message}`);
  // Leave the exit to Node: pulling the process down while the request's socket is still
  // closing trips a libuv assertion on Windows.
  process.exitCode = 1;
}
