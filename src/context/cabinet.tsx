import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { deleteMedicine, listCategories, saveMedicine } from '@/data/database';
import { newRecordId } from '@/data/ids';
import {
  forgetMedicinePhoto,
  keepMedicinePhoto,
  type PickedPhoto,
} from '@/data/medicine-photo';
import type { MedicineCategory } from '@/data/placeholders';

/**
 * What the form hands over once the AI has read a medicine. The group is a name, not an
 * id: the store files the medicine under it, creating the group when the AI names one
 * that is not on the shelf yet.
 */
export type MedicineDraft = {
  name: string;
  dose: string;
  /** Plain-language description of what the medicine does. */
  purpose: string;
  /** The group the AI put it in. */
  category: string;
  /** The pack photo, when one was taken. */
  photo?: PickedPhoto | null;
};

type CabinetContextValue = {
  /** `null` until the store has answered. */
  categories: MedicineCategory[] | null;
  /** File a medicine, photo and all, and re-read the cabinet. */
  addMedicine: (draft: MedicineDraft) => Promise<void>;
  /** Take a medicine off the shelf; its group goes when it was the last one in it. */
  removeMedicine: (medicineId: string) => Promise<void>;
};

const CabinetContext = createContext<CabinetContextValue | null>(null);

/** Read the cabinet, and change it, from anywhere under `<CabinetProvider>`. */
export function useCabinet() {
  const value = use(CabinetContext);

  if (!value) throw new Error('useCabinet must be used inside a <CabinetProvider>');

  return value;
}

/**
 * The cabinet for the whole app. It is held here rather than on the screen because the
 * form is its own route: it writes through this provider, so the cabinet behind it is
 * already up to date by the time it closes.
 */
export function CabinetProvider({ children }: PropsWithChildren) {
  const [categories, setCategories] = useState<MedicineCategory[] | null>(null);

  const refresh = useCallback(async () => {
    setCategories(await listCategories());
  }, []);

  useEffect(() => {
    // A read that lands after unmount must not set state.
    let active = true;

    listCategories()
      .then((stored) => {
        if (active) setCategories(stored);
      })
      .catch((error: unknown) => {
        // Show an empty cabinet rather than a screen that never arrives; the add button
        // still works.
        console.warn('Could not read the cabinet', error);

        if (active) setCategories([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const addMedicine = useCallback(
    async ({ name, dose, purpose, category, photo }: MedicineDraft) => {
      const id = newRecordId('med');
      // The photo is kept under the record's own id, so the file and the row are named
      // together and the picture outlives the cache it was read from.
      const kept = photo ? await keepMedicinePhoto(photo, id) : '';

      await saveMedicine(
        { id, name: name.trim(), dose: dose.trim(), purpose: purpose.trim(), photo: kept },
        category,
      );
      await refresh();
    },
    [refresh],
  );

  const removeMedicine = useCallback(
    async (medicineId: string) => {
      // The store hands back the photo the row pointed at; without this the file would
      // stay on the device with nothing left to reach it.
      const photo = await deleteMedicine(medicineId);

      if (photo) forgetMedicinePhoto(photo);

      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ categories, addMedicine, removeMedicine }),
    [categories, addMedicine, removeMedicine],
  );

  return <CabinetContext.Provider value={value}>{children}</CabinetContext.Provider>;
}
