/**
 * Checks the two parsers — `parseReading` and `parseReport` — against real answers from real
 * models.
 *
 * This is the one part of the AI path that does not need a network: a model that thinks out
 * loud before it answers — Gemma 4 brackets its reasoning in `<thought>`, prose and all — puts
 * braces of its own ahead of the reading, and a parser that took the first `{` to the last `}`
 * would hand `JSON.parse` a thought, a medicine and the fence around them. A report is the
 * harder answer of the two, because it is a list: one unreadable row should cost that row and
 * not the other eleven. The answers below are the shapes the models on Google's
 * OpenAI-compatible layer actually returned.
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 *
 *   node scripts/check-parse.mjs
 */
import assert from 'node:assert/strict';

import { parseReading, parseReport } from '../src/data/ai.ts';

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

/** The message a throw carries, for report answers that should not parse. */
function reportRefusal(answer) {
  try {
    parseReport(answer);
    return '(no error)';
  } catch (error) {
    return error.message;
  }
}

/** What a real report read comes back looking like: one entry per printed result. */
const REPORT = {
  parameters: [
    {
      name: 'Hemoglobin',
      value: '11.2',
      unit: 'g/dL',
      referenceRange: '12.0–15.5',
      status: 'low',
      insight: 'Carries oxygen from your lungs to the rest of your body.',
    },
    {
      name: 'Fasting glucose',
      value: '92',
      unit: 'mg/dL',
      referenceRange: '70–99',
      status: 'normal',
      insight: 'The sugar in your blood after a night without food.',
    },
    {
      name: 'LDL cholesterol',
      value: '214',
      unit: 'mg/dL',
      referenceRange: 'under 130',
      status: 'high',
      insight: 'Carries cholesterol into the walls of your arteries.',
    },
  ],
};

verify('a list of results is the reading', () => {
  assert.deepEqual(parseReport(JSON.stringify(REPORT)), REPORT.parameters);
});

verify('Gemma 4 reasoning and a code fence around a list make no difference', () => {
  const answer = [
    '<thought>I can see a table: test, result, unit, reference range. It wants {"parameters": [...]} — note {braces} of my own.',
    '</thought>',
    '```json',
    JSON.stringify(REPORT),
    '```',
  ].join('\n');

  assert.equal(parseReport(answer).length, 3);
});

verify('the list written last wins over a sample in the reasoning', () => {
  const answer = [
    '<thought>Shape it wants: {"parameters": [{"name": "Example", "value": "1"}]}</thought>',
    '{"parameters": [{"name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "referenceRange": "12.0–15.5", "status": "low", "insight": "Carries oxygen."}]}',
  ].join('\n');

  const parameters = parseReport(answer);

  assert.equal(parameters.length, 1);
  assert.equal(parameters[0].name, 'Hemoglobin');
});

verify('a result named with other words is still read', () => {
  const [parameter] = parseReport(
    '{"parameters": [{"name": "TSH", "value": "3.1", "unit": "mIU/L", "range": "0.4–4.0", "status": "Normal", "note": "Tells your thyroid how hard to work."}]}',
  );

  assert.deepEqual(parameter, {
    name: 'TSH',
    value: '3.1',
    unit: 'mIU/L',
    referenceRange: '0.4–4.0',
    status: 'normal',
    insight: 'Tells your thyroid how hard to work.',
  });
});

verify('a status the app cannot draw reads as in range', () => {
  const [parameter] = parseReport(
    '{"parameters": [{"name": "Vitamin D", "value": "18", "status": "insufficient"}]}',
  );

  assert.equal(parameter.status, 'normal');
});

verify('missing fields read as empty, not as a failure', () => {
  const [parameter] = parseReport('{"parameters": [{"name": "Creatinine", "value": "0.9"}]}');

  assert.deepEqual(parameter, {
    name: 'Creatinine',
    value: '0.9',
    unit: '',
    referenceRange: '',
    status: 'normal',
    insight: '',
  });
});

verify('a row that names no test is dropped, and the rest of the report survives', () => {
  const parameters = parseReport(
    '{"parameters": [{"value": "11.2"}, null, "hemoglobin", {"name": "  ", "value": "1"}, {"name": "Hemoglobin", "value": "11.2"}]}',
  );

  assert.equal(parameters.length, 1);
  assert.equal(parameters[0].name, 'Hemoglobin');
});

verify('a report the model found nothing on is refused', () => {
  const refusalMessage = 'The AI did not find any results on this report. Try a clearer photo.';

  assert.equal(reportRefusal('{"parameters": []}'), refusalMessage);
  assert.equal(reportRefusal('I am sorry, I cannot read this image.'), refusalMessage);
  assert.equal(
    reportRefusal('<thought>No report here.</thought>{"parameters": []}'),
    refusalMessage,
  );
});

verify('a medicine reading is not mistaken for a report', () => {
  // The same tolerance, the other reading: an answer with no list of results in it is
  // refused, rather than read as a report of one.
  assert.equal(
    reportRefusal('{"name": "Paracetamol", "dose": "500 mg", "purpose": "For fever."}'),
    'The AI did not find any results on this report. Try a clearer photo.',
  );
});

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exit(failures === 0 ? 0 : 1);
