/**
 * Checks the storage layer against a real SQLite engine.
 *
 * The app's statements live in `src/data/sql.ts`, apart from `expo-sqlite`, so they can run
 * here over `node:sqlite` — which is how the schema, the migrations and the queries are
 * verified without a simulator or a phone. It covers the device path; the browser build
 * swaps `src/data/database.web.ts` in and is exercised in the app itself. It also opens
 * files an older build left behind, because a file can be current by version and stale by
 * shape — the state that once answered `table medicine has no column named photo` — and
 * those are repaired in place, with their rows, rather than trusted.
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
  SCHEMA,
  categoryIdFor,
  configure,
  deleteMedicine,
  deleteReport,
  deleteSetting,
  insertMedicine,
  insertReport,
  migrate,
  nextCategoryTone,
  selectCategories,
  selectLatestReport,
  selectParameterHistory,
  selectProfile,
  selectSettings,
  upsertProfileName,
  upsertSetting,
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

await verify('a first run has no settings', async () => {
  assert.deepEqual(await selectSettings(fresh), {});
});

await verify('a setting is stored, replaced and forgotten', async () => {
  await upsertSetting(fresh, 'theme', 'dark');
  await upsertSetting(fresh, 'ai-api-key', 'sk-test');

  assert.deepEqual(await selectSettings(fresh), { theme: 'dark', 'ai-api-key': 'sk-test' });

  await upsertSetting(fresh, 'theme', 'light');
  assert.equal((await selectSettings(fresh)).theme, 'light');

  await deleteSetting(fresh, 'ai-api-key');
  assert.deepEqual(await selectSettings(fresh), { theme: 'light' });
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

await verify('upgrading adds an empty settings table', async () => {
  assert.deepEqual(await selectSettings(upgraded), {});
});

await verify('a medicine with no photo reads back as an empty one', async () => {
  assert.equal((await selectCategories(upgraded))[0].medicines[0].photo, '');
});

await verify('migrating twice changes nothing', async () => {
  await migrate(upgraded, medicineCategories);
  assert.equal((await selectCategories(upgraded)).length, 3);
});

/**
 * A file from an install whose `medicine` table predates the `photo` column — the shape that
 * was answered `table medicine has no column named photo`, with its rows already in it.
 *
 * It calls itself current, so every version guard skips it: the only thing that can put it
 * right is the file being checked against the schema the code declares.
 */
async function staleFile(version) {
  const db = driver();

  await configure(db);
  await db.execAsync(`
    PRAGMA user_version = ${version};
    CREATE TABLE profile (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      name TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE category (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      tone TEXT NOT NULL,
      position INTEGER NOT NULL
    );
    CREATE TABLE medicine (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      dose TEXT NOT NULL,
      purpose TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
      position INTEGER NOT NULL
    );
    CREATE TABLE setting (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE INDEX medicine_by_category ON medicine (category_id, position);
  `);
  await db.runAsync(
    'INSERT INTO category (id, name, tone, position) VALUES (?, ?, ?, ?)',
    'fever-pain',
    'Fever & Pain',
    'warning',
    0,
  );
  await db.runAsync(
    `INSERT INTO medicine (id, name, dose, purpose, category_id, position)
     VALUES (?, ?, ?, ?, ?, ?)`,
    'paracetamol',
    'Paracetamol',
    '500 mg',
    'Relieves mild pain and lowers fever.',
    'fever-pain',
    0,
  );

  return db;
}

const stranded = await staleFile(3);

await verify('a file whose medicine table predates the photo column still opens', async () => {
  await migrate(stranded, medicineCategories);
});

await verify('the column it was missing is added', () => {
  const columns = stranded.db.prepare('PRAGMA table_info(medicine)').all().map((c) => c.name);

  assert.ok(columns.includes('photo'), `medicine holds ${columns.join(', ')}`);
});

await verify('and the rows that were there are left where they were', async () => {
  const [category] = await selectCategories(stranded);

  assert.equal(category.medicines.length, 1);
  assert.equal(category.medicines[0].name, 'Paracetamol');
  assert.equal(category.medicines[0].photo, '');
});

await verify('so the insert that failed now lands, photo and all', async () => {
  await insertMedicine(
    stranded,
    { id: 'med_crocin', name: 'Crocin', dose: '650 mg', purpose: 'Lowers fever.', photo: 'file:///p.jpg' },
    'Fever & Pain',
  );

  const row = stranded.db.prepare('SELECT photo FROM medicine WHERE id = ?').get('med_crocin');

  assert.equal(row.photo, 'file:///p.jpg');
  assert.equal((await selectCategories(stranded))[0].medicines.length, 2);
});

await verify('the repair does not depend on the version the file claims', async () => {
  const claiming = await staleFile(9);

  await migrate(claiming, medicineCategories);

  const columns = claiming.db.prepare('PRAGMA table_info(medicine)').all().map((c) => c.name);

  assert.ok(columns.includes('photo'));
  // Nor is a repaired cabinet re-seeded: a file that says it is newer than the code keeps
  // the rows it has, and the samples do not come back for someone who deleted them.
  assert.equal((await selectCategories(claiming)).length, 1);
  assert.equal((await selectCategories(claiming))[0].medicines[0].name, 'Paracetamol');
});

/** Every table's columns, by name — the shape, without the order or the constraints. */
function shape(driver) {
  return Object.fromEntries(
    SCHEMA.map((table) => [
      table.name,
      driver.db
        .prepare(`PRAGMA table_info(${table.name})`)
        .all()
        .map((column) => column.name)
        .sort(),
    ]),
  );
}

await verify('a repaired file, an upgraded one and a fresh install hold the same columns', () => {
  assert.deepEqual(shape(stranded), shape(fresh));
  assert.deepEqual(shape(upgraded), shape(fresh));
});

await verify('and that shape is the one the code declares', () => {
  assert.deepEqual(
    Object.fromEntries(
      SCHEMA.map((table) => [table.name, table.columns.map((column) => column.name).sort()]),
    ),
    shape(fresh),
  );
});

/**
 * The reports store: a scan written whole, the history the cards' trends are drawn from, and
 * a scan taken back with everything it held.
 */
const scanned = driver();
await configure(scanned);
await migrate(scanned, medicineCategories);

const FIRST_SCAN = {
  id: 'report_1',
  takenAt: 1_700_000_000_000,
  photo: '/documents/reports/report_1.jpg',
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

const SECOND_SCAN = {
  id: 'report_2',
  takenAt: 1_700_086_400_000,
  photo: '',
  parameters: [
    {
      name: 'Hemoglobin',
      value: '12.4',
      unit: 'g/dL',
      referenceRange: '12.0–15.5',
      status: 'normal',
      insight: 'Carries oxygen from your lungs to the rest of your body.',
    },
  ],
};

await verify('a first run has no report and no history', async () => {
  assert.equal(await selectLatestReport(scanned), null);
  assert.deepEqual(await selectParameterHistory(scanned), []);
});

await verify('a scanned report is stored whole, in the order it was read', async () => {
  await insertReport(scanned, FIRST_SCAN);

  assert.deepEqual(await selectLatestReport(scanned), FIRST_SCAN);
});

await verify('and its readings become the history a trend is drawn from', async () => {
  const history = await selectParameterHistory(scanned);

  assert.deepEqual(
    history.map((reading) => reading.name),
    ['Hemoglobin', 'Fasting glucose', 'LDL cholesterol'],
  );
  assert.deepEqual(
    history.map((reading) => reading.value),
    ['11.2', '92', '214'],
  );
  assert.deepEqual(
    history.map((reading) => reading.takenAt),
    [FIRST_SCAN.takenAt, FIRST_SCAN.takenAt, FIRST_SCAN.takenAt],
  );
});

await verify('a second scan is the newest one, and the first is still there', async () => {
  await insertReport(scanned, SECOND_SCAN);

  assert.deepEqual(await selectLatestReport(scanned), SECOND_SCAN);
  assert.deepEqual(
    (await selectParameterHistory(scanned)).map((reading) => reading.value),
    ['11.2', '92', '214', '12.4'],
  );
});

await verify('two scans in the same millisecond still have a newest one', async () => {
  await insertReport(scanned, { ...SECOND_SCAN, id: 'report_3' });

  assert.equal((await selectLatestReport(scanned)).id, 'report_3');
});

await verify('taking a report away takes every result it held with it', async () => {
  const photo = await deleteReport(scanned, 'report_2');

  assert.equal(photo, '');
  assert.equal(
    scanned.db.prepare('SELECT COUNT(*) AS rows FROM parameter WHERE report_id = ?').get('report_2')
      .rows,
    0,
  );
  assert.equal((await selectLatestReport(scanned)).id, 'report_3');
  // The scans before it are untouched: removing one is not clearing the tab.
  assert.equal((await selectParameterHistory(scanned)).length, 4);
});

await verify('taking away a report that is not there changes nothing', async () => {
  assert.equal(await deleteReport(scanned, 'report_nowhere'), null);
});

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed`);

process.exit(failures === 0 ? 0 : 1);
