import * as SQLite from 'expo-sqlite';

import type { Profile } from '@/data/profile-types';

/**
 * The on-device database — the app's only store, and the reason nothing has to leave the
 * phone. Reports, medicines and advice land here next; this module opens the file, seeds
 * the profile table and owns the migration step they will follow.
 *
 * `expo-sqlite` keeps the schema version in SQLite's own `user_version` pragma, so
 * migrations run once, in order, and are guarded by the number.
 */
const DATABASE_NAME = 'aushadh.db';

/** Bump in the same change as a new `version < n` block. */
const DATABASE_VERSION = 1;

/** One connection for the whole app — connecting twice would open the same file twice. */
let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/** The stored profile, or `null` on a first run. */
export async function readProfile(): Promise<Profile | null> {
  const db = await connect();
  const row = await db.getFirstAsync<{ name: string }>('SELECT name FROM profile WHERE id = 1');

  return row ? { name: row.name } : null;
}

/** Store the first name, replacing any earlier one. */
export async function writeProfileName(name: string): Promise<void> {
  const db = await connect();

  await db.runAsync(
    `INSERT INTO profile (id, name, updated_at) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    name,
    Date.now(),
  );
}

function connect() {
  connection ??= open();

  return connection;
}

async function open() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(db);

  return db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  if (version >= DATABASE_VERSION) return;

  if (version < 1) {
    // The profile is a single row, pinned to id 1. WAL keeps later readers off the writer.
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        name TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
