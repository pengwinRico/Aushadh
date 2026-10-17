/**
 * Checks the storage layer against a real SQLite engine.
 *
 * The app's statements live in `src/data/sql.ts`, apart from `expo-sqlite`, so they can run
 * here over `node:sqlite` — which is how the schema, the migrations and the queries are
 * verified without a simulator or a phone. It covers the device path; the browser build
 * swaps `src/data/database.web.ts` in and is exercised in the app itself.
 *
 * TypeScript files are imported directly, which needs Node 24's built-in type stripping.
 *
 *   node scripts/check-sql.mjs
 */
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { medicineCategories } from '../src/data/placeholders.ts';
import {
  DATABASE_VERSION,
  categoryIdFor,
  configure,
  deleteMedicine,
  insertMedicine,
  migrate,
  nextCategoryTone,
  selectCategories,
  selectProfile,
  upsertProfileName,
} from '../src/data/sql.ts';

/** `expo-sqlite`'s shape, over a synchronous in-process engine. */
function driver() {
  const db = new DatabaseSync(':memory:');

  return {
    db,
    execAsync: async (source) => db.exec(source),
    runAsync: async (source, ...params) => db.prepare(source).run(...params),
    getFirstAsync: async (source, ...params) => db.prepare(source).get(...params) ?? null,
    getAllAsync: async (source, ...params) => db.prepare(source).all(...params),
  };
}

const results = [];
let failures = 0;

async function verify(description, check) {
  try {
    await check();
    results.push(`ok   ${description}`);
  } catch (error) {
    failures += 1;
    results.push(`FAIL ${description}\n     ${error.message}`);
  }
}

const fresh = driver();
await configure(fresh);
await migrate(fresh, medicineCategories);

await verify('a fresh install lands on the current schema version', () => {
  assert.equal(fresh.db.prepare('PRAGMA user_version').get().user_version, DATABASE_VERSION);
});

const seeded = await selectCategories(fresh);

await verify('the sample cabinet is seeded in design order', () => {
  assert.deepEqual(
    seeded.map((category) => category.name),
    ['Fever & Pain', 'Antibiotics', 'Blood Pressure'],
  );
});

await verify('every group keeps its tone and its medicines', () => {
  assert.deepEqual(
    seeded.map((category) => category.tone),
    ['warning', 'secondary', 'tertiary'],
  );
  assert.deepEqual(
    seeded.map((category) => category.medicines.length),
    [2, 1, 1],
  );
  assert.deepEqual(seeded[0].medicines[0], {
    id: 'paracetamol',
    name: 'Paracetamol',
    dose: '500 mg',
    purpose: 'Relieves mild pain and lowers fever.',
    photo: '',
  });
});

await verify('a first run has no profile', async () => {
  assert.equal(await selectProfile(fresh), null);
});

await verify('the first name is stored, then replaced', async () => {
  await upsertProfileName(fresh, 'Meera');
  assert.deepEqual(await selectProfile(fresh), { name: 'Meera' });

  await upsertProfileName(fresh, 'Meera P');
  assert.deepEqual(await selectProfile(fresh), { name: 'Meera P' });
});

await verify('an empty group still comes back, with no medicines', async () => {
  await fresh.runAsync(
    'INSERT INTO category (id, name, tone, position) VALUES (?, ?, ?, ?)',
    'supplements',
    'Supplements',
    'secondary',
    3,
  );

  const categories = await selectCategories(fresh);
  const supplements = categories.find((category) => category.id === 'supplements');

  assert.deepEqual(supplements, {
    id: 'supplements',
    name: 'Supplements',
    tone: 'secondary',
    medicines: [],
  });
});

await verify('the tints are handed out in turn', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4].map(nextCategoryTone),
    ['warning', 'secondary', 'tertiary', 'warning', 'secondary'],
  );
});

await verify('a group name becomes an id that survives case and spacing', () => {
  assert.equal(categoryIdFor('Fever & Pain'), 'fever-pain');
  assert.equal(categoryIdFor('  blood pressure  '), 'blood-pressure');
  assert.equal(categoryIdFor('Vitamins, Minerals & More'), 'vitamins-minerals-more');
  assert.equal(categoryIdFor('???'), 'other');
});

await verify('every sample group is filed under the id its name derives', () => {
  // The AI answers with names, so the seed has to agree with `categoryIdFor` — otherwise
  // a photographed paracetamol pack would open a second "Fever & Pain".
  for (const category of medicineCategories) {
    assert.equal(categoryIdFor(category.name), category.id, category.name);
  }
});

await verify('a medicine is appended after the ones already in its group', async () => {
  await insertMedicine(
    fresh,
    { id: 'med_vitamin-d', name: 'Vitamin D', dose: '1000 IU', purpose: 'Keeps bones strong.', photo: '' },
    // What the AI answers with is a name; the seeded group is found by it.
    'Antibiotics',
  );

  const categories = await selectCategories(fresh);
  const [fever, antibiotics] = categories;

  assert.deepEqual(
    antibiotics.medicines.map((medicine) => medicine.name),
    ['Amoxicillin', 'Vitamin D'],
  );
  assert.deepEqual(
    fever.medicines.map((medicine) => medicine.name),
    ['Paracetamol', 'Ibuprofen'],
  );
});

await verify('a group the AI names is created for it, with the next tint', async () => {
  await insertMedicine(
    fresh,
    { id: 'med_vitamin-c', name: 'Vitamin C', dose: '500 mg', purpose: 'Supports the immune system.', photo: '' },
    'Vitamins',
  );

  const categories = await selectCategories(fresh);
  const created = categories.at(-1);

  // Four groups were on the shelf, so this one takes the second tint in the turn.
  assert.equal(categories.length, 5);
  assert.deepEqual(
    { ...created, medicines: created.medicines.map((medicine) => medicine.name) },
    { id: 'vitamins', name: 'Vitamins', tone: 'secondary', medicines: ['Vitamin C'] },
  );
});

await verify('the same group under another spelling does not open a second one', async () => {
  await insertMedicine(
    fresh,
    { id: 'med_vitamin-b', name: 'Vitamin B12', dose: '500 mcg', purpose: 'Keeps nerves healthy.', photo: '' },
    'vitamins',
  );

  const categories = await selectCategories(fresh);
  const vitamins = categories.find((category) => category.name.toLowerCase() === 'vitamins');

  assert.equal(categories.length, 5);
  assert.deepEqual(
    vitamins.medicines.map((medicine) => medicine.name),
    ['Vitamin C', 'Vitamin B12'],
  );
});

/** A second install, for the tests that take things back off the shelf. */
const shelf = driver();
await configure(shelf);
await migrate(shelf, medicineCategories);

const KEPT_PHOTO = 'file:///documents/medicines/med_paracetamol.jpg';

await verify('a photo is kept with the medicine it was read from', async () => {
  await insertMedicine(
    shelf,
    {
      id: 'med_paracetamol',
      name: 'Paracetamol',
      dose: '650 mg',
      purpose: 'Relieves mild pain and lowers fever.',
      photo: KEPT_PHOTO,
    },
    'Fever & Pain',
  );

  const kept = (await selectCategories(shelf))[0].medicines.at(-1);

  assert.deepEqual(kept, {
    id: 'med_paracetamol',
    name: 'Paracetamol',
    dose: '650 mg',
    purpose: 'Relieves mild pain and lowers fever.',
    photo: KEPT_PHOTO,
  });
});

await verify('taking a medicine out hands back the photo to clear', async () => {
  assert.equal(await deleteMedicine(shelf, 'med_paracetamol'), KEPT_PHOTO);
});

await verify('a group with medicines left in it stands', async () => {
  await deleteMedicine(shelf, 'paracetamol');

  const categories = await selectCategories(shelf);
  const fever = categories.find((category) => category.id === 'fever-pain');

  assert.deepEqual(
    fever?.medicines.map((medicine) => medicine.name),
    ['Ibuprofen'],
  );
});

await verify('the group goes when the last medicine in it goes', async () => {
  assert.equal(await deleteMedicine(shelf, 'amlodipine'), '');

  const categories = await selectCategories(shelf);

  assert.deepEqual(
    categories.map((category) => category.name),
    ['Fever & Pain', 'Antibiotics'],
  );
});

await verify('taking out a medicine that is not there changes nothing', async () => {
  assert.equal(await deleteMedicine(shelf, 'med_nowhere'), null);
});

/** An install that already ran, before the cabinet existed. */
const upgraded = driver();
await configure(upgraded);
await upgraded.execAsync(`
  PRAGMA user_version = 1;
  CREATE TABLE profile (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
    name TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);
await upgraded.runAsync('INSERT INTO profile (id, name, updated_at) VALUES (1, ?, ?)', 'Meera', 1);

await migrate(upgraded, medicineCategories);

await verify('upgrading keeps the stored name', async () => {
  assert.deepEqual(await selectProfile(upgraded), { name: 'Meera' });
});

await verify('upgrading adds the cabinet and reaches the current version', async () => {
  assert.equal(upgraded.db.prepare('PRAGMA user_version').get().user_version, DATABASE_VERSION);
  assert.equal((await selectCategories(upgraded)).length, 3);
});

await verify('a medicine with no photo reads back as an empty one', async () => {
  assert.equal((await selectCategories(upgraded))[0].medicines[0].photo, '');
});

await verify('migrating twice changes nothing', async () => {
  await migrate(upgraded, medicineCategories);
  assert.equal((await selectCategories(upgraded)).length, 3);
});

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exit(failures === 0 ? 0 : 1);
