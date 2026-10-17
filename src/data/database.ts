import * as SQLite from 'expo-sqlite';

import { medicineCategories, type Medicine } from '@/data/placeholders';
import type { Report } from '@/data/reports';
import type { Settings } from '@/data/settings-types';
import { DEFAULT_SETTINGS, SETTING_KEYS } from '@/data/settings-types';
import {
  configure,
  deleteMedicine as deleteMedicineRow,
  deleteReport as deleteReportRow,
  deleteSetting,
  insertMedicine,
  insertReport,
  migrate,
  selectCategories,
  selectLatestReport,
  selectParameterHistory,
  selectProfile,
  selectSettings,
  upsertProfileName,
  upsertSetting,
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

/** The stored settings, with the defaults filled in where nothing has been saved. */
export async function readSettings(): Promise<Settings> {
  const rows = await selectSettings(await connect());
  const text = (key: string, fallback: string) => rows[key] ?? fallback;

  return {
    // A stored value the app no longer understands falls back to the design's light.
    theme: rows[SETTING_KEYS.theme] === 'dark' ? 'dark' : DEFAULT_SETTINGS.theme,
    aiBaseUrl: text(SETTING_KEYS.aiBaseUrl, DEFAULT_SETTINGS.aiBaseUrl),
    aiModel: text(SETTING_KEYS.aiModel, DEFAULT_SETTINGS.aiModel),
    aiKey: text(SETTING_KEYS.aiKey, DEFAULT_SETTINGS.aiKey),
  };
}

/**
 * Store the settings that changed. An emptied value is deleted rather than saved as an
 * empty string, so the store only ever holds values the app can use — which is also what
 * makes "empty means fall back to the build" true.
 */
export async function writeSettings(settings: Partial<Settings>) {
  const db = await connect();

  for (const [key, value] of Object.entries(settings) as [keyof Settings, string][]) {
    const row = SETTING_KEYS[key];

    if (value) {
      await upsertSetting(db, row, value);
    } else {
      await deleteSetting(db, row);
    }
  }
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

/** The newest scanned report, or `null` when none has been scanned yet. */
export async function listReport() {
  return selectLatestReport(await connect());
}

/** Every reading stored, oldest first — the series a card's trend is drawn from. */
export async function listParameterHistory() {
  return selectParameterHistory(await connect());
}

/** Store a scanned report and everything read from it. */
export async function saveReport(report: Report) {
  await insertReport(await connect(), report);
}

/**
 * Take a scanned report away, its results with it. Returns the photo the row pointed at,
 * so the caller can clear the file.
 */
export async function deleteReport(reportId: string) {
  return deleteReportRow(await connect(), reportId);
}

function connect() {
  connection ??= open();

  return connection;
}

async function open() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await configure(db);

  // The cabinet a first run starts with, into its own tables.
  await migrate(db, medicineCategories);

  return db;
}
