import type { CategoryTone, Medicine, MedicineCategory } from '@/data/placeholders';

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
export const DATABASE_VERSION = 2;

/** What a medicine is filed under when the AI does not name a group. */
export const OTHER_CATEGORY = 'Other';

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
 * and keeps its rows.
 *
 * The sample cabinet is passed in rather than imported, which keeps this module free of
 * app modules and the seed swappable when a report can fill the cabinet itself.
 */
export async function migrate(db: SqlDatabase, seed: MedicineCategory[]) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version < 1) {
    // The profile is a single row, pinned to id 1.
    await db.execAsync(`
      CREATE TABLE profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  if (version < 2) {
    // The cabinet. A medicine is a row of its own, so adding one never rewrites a list,
    // and `position` keeps both the groups and the medicines inside them in the order
    // the screen shows them. `photo` is the pack photo on the device, empty when there
    // is none.
    await db.execAsync(`
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
        photo TEXT,
        category_id TEXT NOT NULL REFERENCES category (id) ON DELETE CASCADE,
        position INTEGER NOT NULL
      );
      CREATE INDEX medicine_by_category ON medicine (category_id, position);
    `);

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

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
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
