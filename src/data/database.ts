import * as SQLite from 'expo-sqlite';

import { medicineCategories, type Medicine } from '@/data/placeholders';
import {
  configure,
  deleteMedicine as deleteMedicineRow,
  insertMedicine,
  migrate,
  selectCategories,
  selectProfile,
  upsertProfileName,
} from '@/data/sql';

/**
 * The on-device database — the app's only store, and the reason nothing has to leave the
 * phone. The schema and the statements live in `src/data/sql.ts`; this module owns the
 * file itself: open it once, migrate it, hand it to the statements.
 *
 * Everything a screen stores goes through here, so the app has one seam to encrypt (a
 * SQLCipher build) and one module to swap when a table is added.
 */
const DATABASE_NAME = 'aushadh.db';

/** One connection for the whole app — connecting twice would open the same file twice. */
let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/** The stored profile, or `null` on a first run. */
export async function readProfile() {
  return selectProfile(await connect());
}

/** Store the first name, replacing any earlier one. */
export async function writeProfileName(name: string) {
  await upsertProfileName(await connect(), name);
}

/** The cabinet: every category in order, each with the medicines it holds. */
export async function listCategories() {
  return selectCategories(await connect());
}

/**
 * File a medicine under a group — the one the AI named. A group that is not on the shelf
 * yet is created for it; the store owns that rule, so the screen only passes the name.
 */
export async function saveMedicine(medicine: Medicine, categoryName: string) {
  await insertMedicine(await connect(), medicine, categoryName);
}

/**
 * Take a medicine off the shelf, and its group with it once nothing is left in it.
 * Returns the photo the row pointed at, so the caller can clear the file.
 */
export async function deleteMedicine(medicineId: string) {
  return deleteMedicineRow(await connect(), medicineId);
}

function connect() {
  connection ??= open();

  return connection;
}

async function open() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await configure(db);

  // The sample cabinet stands in until a scanned report can fill the shelf itself.
  await migrate(db, medicineCategories);

  return db;
}
