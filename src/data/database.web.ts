import { categoryIdFor, nextCategoryTone, OTHER_CATEGORY } from '@/data/sql';
import { medicineCategories, type Medicine, type MedicineCategory } from '@/data/placeholders';
import type { Profile } from '@/data/profile-types';
import type { Settings } from '@/data/settings-types';
import { DEFAULT_SETTINGS } from '@/data/settings-types';

/**
 * Browser stand-in for the on-device database.
 *
 * `expo-sqlite` on web wants a wasm bundle plus cross-origin isolation headers, and the
 * app ships to iOS and Android — the browser build exists to preview screens, so records
 * are kept in `localStorage` there. Both modules export the same API, so no screen knows
 * the difference.
 */
const PROFILE_KEY = 'aushadh.profile';
const CABINET_KEY = 'aushadh.cabinet';
const SETTINGS_KEY = 'aushadh.settings';

/** The stored profile, or `null` on a first run. */
export async function readProfile(): Promise<Profile | null> {
  const profile = read<Profile>(PROFILE_KEY);

  return typeof profile?.name === 'string' ? profile : null;
}

/** Store the first name, replacing any earlier one. */
export async function writeProfileName(name: string): Promise<void> {
  write(PROFILE_KEY, { name });
}

/** The stored settings, with the defaults filled in where nothing has been saved. */
export async function readSettings(): Promise<Settings> {
  const stored = read<Partial<Settings>>(SETTINGS_KEY);
  const text = (key: 'aiBaseUrl' | 'aiModel' | 'aiKey') =>
    typeof stored?.[key] === 'string' ? (stored[key] as string) : DEFAULT_SETTINGS[key];

  return {
    theme: stored?.theme === 'dark' ? 'dark' : DEFAULT_SETTINGS.theme,
    aiBaseUrl: text('aiBaseUrl'),
    aiModel: text('aiModel'),
    aiKey: text('aiKey'),
  };
}

/** Store the settings that changed; the browser has no row to delete, so empty is stored. */
export async function writeSettings(settings: Partial<Settings>): Promise<void> {
  write(SETTINGS_KEY, { ...(await readSettings()), ...settings });
}

/** The cabinet: every category in order, each with the medicines it holds. */
export async function listCategories(): Promise<MedicineCategory[]> {
  const stored = read<MedicineCategory[]>(CABINET_KEY);

  return Array.isArray(stored) ? stored : sampleCabinet();
}

/**
 * File a medicine under a group — the one the AI named — creating that group when it is
 * not there yet. `insertMedicine` in `src/data/sql.ts` is the same rule over SQL, and the
 * two share the id and the tint a new group is given so both stores agree.
 */
export async function saveMedicine(medicine: Medicine, categoryName: string): Promise<void> {
  const name = categoryName.trim() || OTHER_CATEGORY;
  const id = categoryIdFor(name);
  const categories = await listCategories();
  const existing = categories.find(
    (category) => category.id === id || category.name.toLowerCase() === name.toLowerCase(),
  );

  write(
    CABINET_KEY,
    existing
      ? categories.map((category) =>
          category.id === existing.id
            ? { ...category, medicines: [...category.medicines, medicine] }
            : category,
        )
      : [
          ...categories,
          {
            id,
            name,
            tone: nextCategoryTone(categories.length),
            medicines: [medicine],
          } satisfies MedicineCategory,
        ],
  );
}

/**
 * Take a medicine off the shelf, and its group with it once nothing is left in it.
 * Returns the photo the row pointed at, or `null` when there was no such medicine.
 */
export async function deleteMedicine(medicineId: string): Promise<string | null> {
  const categories = await listCategories();
  const group = categories.find((category) =>
    category.medicines.some((medicine) => medicine.id === medicineId),
  );

  if (!group) return null;

  const photo = group.medicines.find((medicine) => medicine.id === medicineId)?.photo ?? '';

  write(
    CABINET_KEY,
    categories
      .map((category) =>
        category.id === group.id
          ? {
              ...category,
              medicines: category.medicines.filter((medicine) => medicine.id !== medicineId),
            }
          : category,
      )
      .filter((category) => category.medicines.length > 0),
  );

  return photo;
}

/** The sample groups, as the device seeds them in its first migration. */
function sampleCabinet(): MedicineCategory[] {
  return medicineCategories.map((category) => ({
    ...category,
    medicines: category.medicines.map((medicine) => ({ ...medicine })),
  }));
}

function read<T>(key: string): T | null {
  try {
    const stored = globalThis.localStorage?.getItem(key);

    return stored ? (JSON.parse(stored) as T) : null;
  } catch (error) {
    // Browsers in private mode reject reads; treat that as a first run.
    console.warn(`Could not read ${key}`, error);

    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not store ${key}`, error);
  }
}
