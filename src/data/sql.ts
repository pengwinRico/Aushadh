import type { CategoryTone, Medicine, MedicineCategory } from '@/data/placeholders';
// Relative on purpose: `scripts/check-*.mjs` load this module through Node, which knows
// nothing of `tsconfig` paths — `@/data/reports` would resolve in the bundler and nowhere
// else. Importing a sibling is the one style the app and the checks can both read.
import { toStatus, type ParameterReading, type Report } from './reports.ts';

/**
 * Every statement the app runs, and the schema they run against.
 *
 * It sits apart from `expo-sqlite` on purpose: the module imports no native code, so the
 * migrations and queries can be exercised against a real SQLite engine in Node —
 * `scripts/check-sql.mjs` runs them over `node:sqlite`, which is how the device path is
 * tested without a device. `src/data/database.ts` is the thin binding that hands these
 * functions a connection.
 */

/** Bound parameters. SQLite takes strings, numbers and null; nothing else is stored. */
export type SqlValue = string | number | null;

/** The slice of `expo-sqlite`'s API these statements use — and all a driver has to be. */
export type SqlDatabase = {
  execAsync: (source: string) => Promise<void>;
  runAsync: (source: string, ...params: SqlValue[]) => Promise<unknown>;
  getFirstAsync: <T>(source: string, ...params: SqlValue[]) => Promise<T | null>;
  getAllAsync: <T>(source: string, ...params: SqlValue[]) => Promise<T[]>;
};

/** Bump in the same change as a new `version < n` block. */
export const DATABASE_VERSION = 4;

/** What a medicine is filed under when the AI does not name a group. */
export const OTHER_CATEGORY = 'Other';

/**
 * The shape the code needs, as data rather than as SQL written out in each place.
 *
 * The version number in a file is a claim about its shape, not a fact about it: an install
 * can be marked current and still be missing a column the statements name. That is what
 * answered `table medicine has no column named photo` on a phone, with the migration
 * returning early because the file said it was up to date and no statement able to repair
 * it. Declaring the shape once lets `ensureSchema` read it and check the file against it on
 * every open, and lets `scripts/check-sql.mjs` hold a fresh install against the same list,
 * so the two cannot drift apart.
 */
type Column = {
  name: string;
  /** SQLite's type affinity — `TEXT`, `INTEGER`. */
  type: string;
  /** The column the row is keyed by. One per table. */
  primary?: boolean;
  notNull?: boolean;
  /** A table-level rule, written as SQLite's `CHECK`. */
  check?: string;
  /** The table and clause a foreign key points at. */
  references?: string;
};

type Table = {
  name: string;
  columns: Column[];
  /** A covering index, when the screen's ordering reads one. */
  index?: { name: string; columns: string[] };
};

export const SCHEMA: readonly Table[] = [
  {
    name: 'profile',
    columns: [
      // The profile is a single row, pinned to id 1.
      { name: 'id', type: 'INTEGER', primary: true, notNull: true, check: 'id = 1' },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'updated_at', type: 'INTEGER', notNull: true },
    ],
  },
  {
    name: 'category',
    columns: [
      { name: 'id', type: 'TEXT', primary: true, notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'tone', type: 'TEXT', notNull: true },
      { name: 'position', type: 'INTEGER', notNull: true },
    ],
  },
  {
    name: 'medicine',
    columns: [
      { name: 'id', type: 'TEXT', primary: true, notNull: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'dose', type: 'TEXT', notNull: true },
      { name: 'purpose', type: 'TEXT', notNull: true },
      // The pack photo on the device, empty when there is none.
      { name: 'photo', type: 'TEXT' },
      { name: 'category_id', type: 'TEXT', notNull: true, references: 'category (id) ON DELETE CASCADE' },
      { name: 'position', type: 'INTEGER', notNull: true },
    ],
    index: { name: 'medicine_by_category', columns: ['category_id', 'position'] },
  },
  {
    name: 'setting',
    columns: [
      { name: 'key', type: 'TEXT', primary: true, notNull: true },
      { name: 'value', type: 'TEXT', notNull: true },
    ],
  },
  {
    // One row per scanned report, so the parameters of the scan before it stay readable —
    // which is what makes a trend a comparison between two reports rather than a decoration.
    name: 'report',
    columns: [
      { name: 'id', type: 'TEXT', primary: true, notNull: true },
      { name: 'taken_at', type: 'INTEGER', notNull: true },
      // The photo of the paper, kept on the device, empty when there is none.
      { name: 'photo', type: 'TEXT' },
    ],
  },
  {
    // A result on a report. The reading is stored as the report prints it — "11.2", "g/dL",
    // "12.0–15.5" — and the reference range as text, because ranges are printed in words as
    // often as numbers ("under 130").
    name: 'parameter',
    columns: [
      { name: 'id', type: 'TEXT', primary: true, notNull: true },
      {
        name: 'report_id',
        type: 'TEXT',
        notNull: true,
        references: 'report (id) ON DELETE CASCADE',
      },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'value', type: 'TEXT', notNull: true },
      { name: 'unit', type: 'TEXT', notNull: true },
      { name: 'reference_range', type: 'TEXT', notNull: true },
      { name: 'status', type: 'TEXT', notNull: true },
      { name: 'insight', type: 'TEXT', notNull: true },
      { name: 'position', type: 'INTEGER', notNull: true },
    ],
    index: { name: 'parameter_by_report', columns: ['report_id', 'position'] },
  },
];

/** One column as it is written in a `CREATE TABLE`. */
function defineColumn(column: Column) {
  return [
    column.name,
    column.type,
    column.primary ? 'PRIMARY KEY' : '',
    column.notNull ? 'NOT NULL' : '',
    column.check ? `CHECK (${column.check})` : '',
    column.references ? `REFERENCES ${column.references}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function tableOf(name: string) {
  const table = SCHEMA.find((candidate) => candidate.name === name);

  if (!table) throw new Error(`no table called ${name} in the schema`);

  return table;
}

/** `CREATE TABLE IF NOT EXISTS`, so a half-built file is completed rather than fought over. */
function createTable(name: string) {
  const table = tableOf(name);

  return `CREATE TABLE IF NOT EXISTS ${table.name} (\n  ${table.columns
    .map(defineColumn)
    .join(',\n  ')}\n)`;
}

function createIndex(name: string) {
  const index = tableOf(name).index;

  return index
    ? `CREATE INDEX IF NOT EXISTS ${index.name} ON ${name} (${index.columns.join(', ')})`
    : '';
}

/**
 * A column added to a table that is already there, for `ensureSchema`.
 *
 * Only the type and the `NOT NULL` are carried over. SQLite refuses to add a column with
 * `PRIMARY KEY`, and refuses a `REFERENCES` clause unless the default is null, so a repaired
 * column takes neither — a file that lost its key or its foreign key along with a column is
 * not one the app can use anyway, and filling the rows with an empty value keeps what is
 * left of them.
 */
function defineAddedColumn(column: Column) {
  const fill = column.type === 'INTEGER' ? '0' : "''";

  return [column.name, column.type, column.notNull ? `NOT NULL DEFAULT ${fill}` : '']
    .filter(Boolean)
    .join(' ');
}

/**
 * Hold the file against the declared schema, whatever version it claims to be.
 *
 * Reads `PRAGMA table_info` — four small queries, once per open — and adds anything the
 * statements need and the file does not have, leaving rows exactly where they are. A table
 * that is missing altogether is created; a column that is missing is appended, which is why
 * its order differs from a fresh install's (every statement names its columns, so the order
 * does not matter). A repaired cabinet is left empty rather than re-seeded: those rows were
 * never there, and the samples must not come back for someone who deleted them.
 */
async function ensureSchema(db: SqlDatabase) {
  for (const table of SCHEMA) {
    await db.execAsync(createTable(table.name));

    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table.name})`);
    const present = new Set(columns.map((column) => column.name));

    for (const column of table.columns) {
      if (present.has(column.name) || column.primary) continue;

      await db.execAsync(
        `ALTER TABLE ${table.name} ADD COLUMN ${defineAddedColumn(column)}`,
      );
      // Worth a line in the log: this is the file being repaired, and the shape it had.
      console.log(`schema: ${table.name} was missing ${column.name}, added it`);
    }

    const index = createIndex(table.name);
    if (index) await db.execAsync(index);
  }
}

/** Connection settings, applied on every open — on a fresh file and on one that is
 * already current, which is why they are not part of a migration step. WAL keeps later
 * readers off the writer; foreign keys make a medicine's category a real reference. */
export async function configure(db: SqlDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}

/**
 * Bring the file up to `DATABASE_VERSION`. Each block is guarded by the version it
 * produces, so an install that already holds an older schema runs only what it is missing
 * and keeps its rows — and then `ensureSchema` holds the result against the shape the code
 * uses, because a version number cannot be trusted to describe it.
 *
 * The sample cabinet is passed in rather than imported, which keeps this module free of
 * app modules and the seed swappable when a report can fill the cabinet itself.
 */
export async function migrate(db: SqlDatabase, seed: MedicineCategory[]) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version < DATABASE_VERSION) {
    if (version < 1) {
      await db.execAsync(createTable('profile'));
    }

    if (version < 2) {
      // The cabinet: a medicine is a row of its own, so adding one never rewrites a list,
      // and `position` keeps both the groups and the medicines inside them in the order
      // the screen shows them.
      await db.execAsync(createTable('category'));
      await db.execAsync(createTable('medicine'));
      await db.execAsync(createIndex('medicine'));

      await seedCabinet(db, seed);
    }

    if (version < 3) {
      // Settings are rows rather than columns, so one more costs no migration: the theme
      // and the AI key are both just keys here.
      await db.execAsync(createTable('setting'));
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }

  // Not something a version number can excuse: the file has to hold the columns the
  // statements name, or the next insert fails with nothing able to repair it.
  await ensureSchema(db);
}

/** The sample cabinet, onto a cabinet that is empty — a half-applied migration included. */
async function seedCabinet(db: SqlDatabase, seed: MedicineCategory[]) {
  const row = await db.getFirstAsync<{ rows: number }>('SELECT COUNT(*) AS rows FROM category');

  if ((row?.rows ?? 0) > 0) return;

  for (const [position, category] of seed.entries()) {
    await db.runAsync(
      'INSERT INTO category (id, name, tone, position) VALUES (?, ?, ?, ?)',
      category.id,
      category.name,
      category.tone,
      position,
    );

    for (const [index, medicine] of category.medicines.entries()) {
      await db.runAsync(
        `INSERT INTO medicine (id, name, dose, purpose, photo, category_id, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        medicine.id,
        medicine.name,
        medicine.dose,
        medicine.purpose,
        medicine.photo || null,
        category.id,
        index,
      );
    }
  }
}

/** The stored profile, or `null` on a first run. */
export async function selectProfile(db: SqlDatabase) {
  const row = await db.getFirstAsync<{ name: string }>('SELECT name FROM profile WHERE id = 1');

  return row ? { name: row.name } : null;
}

/** Store the first name, replacing any earlier one. */
export async function upsertProfileName(db: SqlDatabase, name: string) {
  await db.runAsync(
    `INSERT INTO profile (id, name, updated_at) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    name,
    Date.now(),
  );
}

/** Every stored setting, by key — the theme, the AI key, and whatever comes next. */
export async function selectSettings(db: SqlDatabase) {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM setting',
  );
  const settings: Record<string, string> = {};

  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return settings;
}

/** Store one setting, replacing an earlier value. */
export async function upsertSetting(db: SqlDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO setting (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/** Forget one setting, so a cleared value leaves nothing behind. */
export async function deleteSetting(db: SqlDatabase, key: string) {
  await db.runAsync('DELETE FROM setting WHERE key = ?', key);
}

/** The tints a group can take, in the order new groups are given them. */
const CATEGORY_TONES: CategoryTone[] = ['warning', 'secondary', 'tertiary'];

export function nextCategoryTone(taken: number): CategoryTone {
  return CATEGORY_TONES[taken % CATEGORY_TONES.length] ?? 'warning';
}

/**
 * A group's id, derived from its name.
 *
 * Names come from the model and repeat — "Fever & Pain" every time someone photographs a
 * paracetamol pack — so deriving the id makes the same group land on the same row however
 * the name is spelled in case, spacing or punctuation.
 */
export function categoryIdFor(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || categoryIdFor(OTHER_CATEGORY);
}

/** One row per medicine, with its group repeated — grouped into the screen's shape below. */
type CategoryRow = {
  id: string;
  name: string;
  tone: string;
  medicine_id: string | null;
  medicine_name: string | null;
  dose: string | null;
  purpose: string | null;
  photo: string | null;
};

/** Every category in order, each with the medicines it holds, in order. */
export async function selectCategories(db: SqlDatabase): Promise<MedicineCategory[]> {
  const rows = await db.getAllAsync<CategoryRow>(`
    SELECT c.id, c.name, c.tone,
           m.id AS medicine_id, m.name AS medicine_name, m.dose, m.purpose, m.photo
    FROM category c
    LEFT JOIN medicine m ON m.category_id = c.id
    ORDER BY c.position, m.position
  `);

  const categories: MedicineCategory[] = [];

  for (const row of rows) {
    // The ordering above keeps each category's rows together, so the last one is ours.
    let category = categories.at(-1);

    if (!category || category.id !== row.id) {
      category = { id: row.id, name: row.name, tone: row.tone as CategoryTone, medicines: [] };
      categories.push(category);
    }

    if (row.medicine_id) {
      category.medicines.push({
        id: row.medicine_id,
        name: row.medicine_name ?? '',
        dose: row.dose ?? '',
        purpose: row.purpose ?? '',
        photo: row.photo ?? '',
      });
    }
  }

  return categories;
}

/**
 * File a medicine under a group, creating that group when it is not on the shelf yet —
 * which is how the model's answer becomes a category. Names are matched with the id
 * derived from them, so "Antibiotics" joins the group that is already there rather than a
 * second one beside it.
 */
export async function insertMedicine(db: SqlDatabase, medicine: Medicine, categoryName: string) {
  const name = categoryName.trim() || OTHER_CATEGORY;
  const id = categoryIdFor(name);
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM category WHERE id = ? OR lower(name) = lower(?)',
    id,
    name,
  );
  let categoryId = existing?.id;

  if (!categoryId) {
    const row = await db.getFirstAsync<{ taken: number }>(
      'SELECT COUNT(*) AS taken FROM category',
    );
    const taken = row?.taken ?? 0;

    await db.runAsync(
      'INSERT INTO category (id, name, tone, position) VALUES (?, ?, ?, ?)',
      id,
      name,
      nextCategoryTone(taken),
      taken,
    );

    categoryId = id;
  }

  const last = await db.getFirstAsync<{ position: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS position FROM medicine WHERE category_id = ?',
    categoryId,
  );

  await db.runAsync(
    `INSERT INTO medicine (id, name, dose, purpose, photo, category_id, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    medicine.id,
    medicine.name,
    medicine.dose,
    medicine.purpose,
    medicine.photo || null,
    categoryId,
    last?.position ?? 0,
  );
}

/**
 * Take a medicine off the shelf, and the group with it once nothing is left in it.
 *
 * Returns the photo to delete, or `null` when there was no such medicine, so the caller
 * can clear the file the row pointed at.
 */
export async function deleteMedicine(db: SqlDatabase, medicineId: string) {
  const row = await db.getFirstAsync<{ category_id: string; photo: string | null }>(
    'SELECT category_id, photo FROM medicine WHERE id = ?',
    medicineId,
  );

  if (!row) return null;

  await db.runAsync('DELETE FROM medicine WHERE id = ?', medicineId);
  await db.runAsync(
    `DELETE FROM category
     WHERE id = ? AND NOT EXISTS (SELECT 1 FROM medicine WHERE category_id = ?)`,
    row.category_id,
    row.category_id,
  );

  return row.photo ?? '';
}

/** The columns of a stored result. The status arrives as text and is read into a tone. */
type ParameterRow = {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: string;
  insight: string;
};

/**
 * Store a scanned report and everything read from it.
 *
 * The parameters are written under ids derived from the report's, so a scan is stored whole
 * and can be taken away whole — `parameter.report_id` cascades — and no second id has to be
 * minted for a row nobody addresses by name.
 */
export async function insertReport(db: SqlDatabase, report: Report) {
  await db.runAsync(
    'INSERT INTO report (id, taken_at, photo) VALUES (?, ?, ?)',
    report.id,
    report.takenAt,
    report.photo || null,
  );

  for (const [position, parameter] of report.parameters.entries()) {
    await db.runAsync(
      `INSERT INTO parameter
         (id, report_id, name, value, unit, reference_range, status, insight, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `${report.id}_${position}`,
      report.id,
      parameter.name,
      parameter.value,
      parameter.unit,
      parameter.referenceRange,
      parameter.status,
      parameter.insight,
      position,
    );
  }
}

/**
 * The newest report, with its results in the order they were read — what the Reports tab
 * shows. `taken_at` is the sort, with `rowid` behind it, so two scans a millisecond apart
 * still have a newest one.
 */
export async function selectLatestReport(db: SqlDatabase): Promise<Report | null> {
  const latest = await db.getFirstAsync<{ id: string; taken_at: number; photo: string | null }>(
    'SELECT id, taken_at, photo FROM report ORDER BY taken_at DESC, rowid DESC LIMIT 1',
  );

  if (!latest) return null;

  const rows = await db.getAllAsync<ParameterRow>(
    'SELECT name, value, unit, reference_range, status, insight FROM parameter WHERE report_id = ? ORDER BY position',
    latest.id,
  );

  return {
    id: latest.id,
    takenAt: latest.taken_at,
    photo: latest.photo ?? '',
    parameters: rows.map((row) => ({
      name: row.name,
      value: row.value,
      unit: row.unit,
      referenceRange: row.reference_range,
      // A word the app cannot draw is read as in range rather than thrown away.
      status: toStatus(row.status),
      insight: row.insight,
    })),
  };
}

/**
 * Every stored reading, oldest report first — the series a card's trend is drawn from.
 *
 * It reads across all the reports rather than the newest one because that is the whole
 * point of keeping them: "↓ 0.8 since last" is a comparison, and a comparison needs the
 * report before it.
 */
export async function selectParameterHistory(db: SqlDatabase): Promise<ParameterReading[]> {
  const rows = await db.getAllAsync<{ name: string; value: string; taken_at: number }>(`
    SELECT p.name, p.value, r.taken_at
    FROM parameter p
    JOIN report r ON r.id = p.report_id
    ORDER BY r.taken_at, r.rowid, p.position
  `);

  return rows.map((row) => ({ name: row.name, value: row.value, takenAt: row.taken_at }));
}

/**
 * Take a scanned report away, the results with it. Returns the photo to delete, or `null`
 * when there was no such report, so the caller can clear the file the row pointed at.
 */
export async function deleteReport(db: SqlDatabase, reportId: string) {
  const row = await db.getFirstAsync<{ photo: string | null }>(
    'SELECT photo FROM report WHERE id = ?',
    reportId,
  );

  if (!row) return null;

  await db.runAsync('DELETE FROM report WHERE id = ?', reportId);

  return row.photo ?? '';
}
