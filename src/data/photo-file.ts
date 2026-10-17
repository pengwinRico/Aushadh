import { Directory, File, Paths } from 'expo-file-system';

import type { PickedPhoto } from '@/data/medicine-photo';

/**
 * Where a pack photo is kept: the app's own folder on the device, beside the database.
 *
 * `expo-file-system` is native-only, so the browser build swaps in `photo-file.web.ts`.
 * Both modules export the same two functions, so the capture code never branches on
 * platform — and a photo never touches the photo library, which is the point of keeping
 * records here.
 */

/** The folder pack photos live in, in the app's documents directory. */
const FOLDER = 'medicines';

/** Move a resized photo into the app's folder, and say where it now lives. */
export async function keepPhotoFile(photo: PickedPhoto, id: string) {
  const folder = new Directory(Paths.document, FOLDER);

  if (!folder.exists) folder.create();

  const kept = new File(folder, `${id}.jpg`);
  await new File(photo.preview).copy(kept);

  return kept.uri;
}

/** Take the photo with the record when the record goes. */
export function removePhotoFile(uri: string) {
  try {
    const file = new File(uri);

    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete a medicine photo', error);
  }
}
