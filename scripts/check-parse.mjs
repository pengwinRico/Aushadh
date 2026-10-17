/**
 * Checks `parseReading` against real answers from real models.
 *
 * This is the one part of the AI path that does not need a network: a model that thinks out
 * loud before it answers — Gemma 4 brackets its reasoning in `<thought>`, prose and all — puts
 * braces of its own ahead of the reading, and a parser that took the first `{` to the last `}`
 * would hand `JSON.parse` a thought, a medicine and the fence around them. The answers below
 * are the shapes the models on Google's OpenAI-compatible layer actually returned.
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 *
 *   node scripts/check-parse.mjs
 */
import assert from 'node:assert/strict';

import { parseReading } from '../src/data/ai.ts';

const results = [];
let failures = 0;

function verify(description, check) {
  try {
    check();
    results.push(`ok   ${description}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${description}\n     ${error.message}`);
  }
}

/** The message a throw carries, for the answers that should not parse. */
function refusal(answer) {
  try {
    parseReading(answer);
    return '(no error)';
  } catch (error) {
    return error.message;
  }
}

verify('a bare JSON object is the reading', () => {
  assert.deepEqual(
    parseReading(
      '{"name": "Paracetamol", "dose": "500 mg", "purpose": "Relieves mild pain and lowers fever.", "category": "Fever & Pain"}',
    ),
    {
      name: 'Paracetamol',
      dose: '500 mg',
      purpose: 'Relieves mild pain and lowers fever.',
      category: 'Fever & Pain',
    },
  );
});

verify('a code fence around it makes no difference', () => {
  const answer = [
    '```json',
    '{',
    ' "name": "Paracetamol",',
    ' "dose": "500 mg",',
    ' "purpose": "It is used to relieve mild to moderate pain and to reduce fever.",',
    ' "category": "Fever & Pain"',
    '}',
    '```',
  ].join('\n');

  assert.equal(parseReading(answer).name, 'Paracetamol');
});

verify('Gemma 4 reasoning ahead of the answer is skipped', () => {
  // The real shape: a `<thought>` block, then the reading.
  const answer = [
    '<thought>* Input: "Name the medicine Paracetamol and say what it is for."',
    ' * Constraint: "Answer with JSON only."',
    ' * Task: Identify the medicine name and its purpose.',
    '',
    ' * Medicine: Paracetamol',
    ' * Purpose: Pain relief (analgesic) and fever reduction (antipyretic).',
    '',
    ' * Keys: `name`, `purpose` (or similar).',
    ' * Values: "Paracetamol", "Pain relief and fever reduction".',
    '</thought>',
    '{"name": "Paracetamol", "dose": "500 mg", "purpose": "Relieves mild pain and lowers fever.", "category": "Fever & Pain"}',
  ].join('\n');

  assert.equal(parseReading(answer).name, 'Paracetamol');
});

verify('braces inside the reasoning do not derail it', () => {
  const answer = [
    '<thought>Shape it wants: {"name": ..., "purpose": ...} — and a nested {a: {b}} for good measure.',
    'Careful: an unbalanced { brace left open.',
    '</thought>',
    '{"name": "Ibuprofen", "dose": "200 mg", "purpose": "Relieves pain and swelling.", "category": "Fever & Pain"}',
  ].join('\n');

  assert.equal(parseReading(answer).name, 'Ibuprofen');
});

verify('the reading written last wins over a sample in the reasoning', () => {
  const answer = [
    '<thought>A worked example: {"name": "Example", "dose": "", "purpose": "not this one", "category": "Other"}</thought>',
    '{"name": "Crocin", "dose": "650 mg", "purpose": "Lowers fever.", "category": "Fever & Pain"}',
  ].join('\n');

  assert.equal(parseReading(answer).name, 'Crocin');
});

verify('braces and quotes inside a value are kept', () => {
  const answer =
    'Here it is: {"name": "Crocin \\"DS\\"", "dose": "650 mg", "purpose": "For fever {and} pain", "category": "Fever & Pain"} — hope that helps!';

  assert.deepEqual(parseReading(answer), {
    name: 'Crocin "DS"',
    dose: '650 mg',
    purpose: 'For fever {and} pain',
    category: 'Fever & Pain',
  });
});

verify('a nested object in the answer does not end the scan early', () => {
  const answer =
    '{"name": "Metformin", "dose": "500 mg", "purpose": "Lowers blood sugar.", "category": "Sugar", "meta": {"confidence": 0.9}}';

  assert.equal(parseReading(answer).name, 'Metformin');
});

verify('missing fields read as empty, not as a failure', () => {
  assert.deepEqual(parseReading('{"name": "Aspirin"}'), {
    name: 'Aspirin',
    dose: '',
    purpose: '',
    category: '',
  });
});

verify('an answer with no object at all is refused', () => {
  assert.equal(
    refusal('I am sorry, I cannot read this image.'),
    'The AI did not answer with a medicine. Try a clearer photo.',
  );
});

verify('the empty reading the prompt asks for is refused', () => {
  assert.equal(
    refusal('<thought>No pack here.</thought>{"name": "", "dose": "", "purpose": "", "category": ""}'),
    'The AI could not read a medicine here. Try a clearer photo.',
  );
});

verify('a truncated object ahead of the answer is skipped', () => {
  const answer = '{"name": "Broken", "dose": "5 mg"\n{"name": "Cetirizine", "dose": "10 mg"}';

  assert.equal(parseReading(answer).name, 'Cetirizine');
});

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exit(failures === 0 ? 0 : 1);
