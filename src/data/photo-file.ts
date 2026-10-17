import { Directory, File, Paths } from 'expo-file-system';

import type { PickedPhoto } from '@/data/photo';

/**
 * Where a photo is kept: the app's own folder on the device, beside the database, in a
 * folder of its own per kind of record — `medicines/`, `reports/`.
 *
 * `expo-file-system` is native-only, so the browser build swaps in `photo-file.web.ts`.
 * Both modules export the same two functions, so the capture code never branches on
 * platform — and a photo never touches the photo library, which is the point of keeping
 * records here.
 */

/** Move a resized photo into the app's folder, and say where it now lives. */
export async function keepPhotoFile(photo: PickedPhoto, id: string, folder: string) {
  const directory = new Directory(Paths.document, folder);

  if (!directory.exists) directory.create();

  const kept = new File(directory, `${id}.jpg`);
  await new File(photo.preview).copy(kept);

  return kept.uri;
}

/** Take the photo with the record when the record goes. */
export function removePhotoFile(uri: string) {
  try {
    const file = new File(uri);

    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not delete a kept photo', error);
  }
}
