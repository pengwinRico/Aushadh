import type { PickedPhoto } from '@/data/medicine-photo';

/**
 * The browser keeps a pack photo as the data URL it was read as.
 *
 * A resized image comes back from the manipulator as a blob URL, and a blob URL dies with
 * the page — so the record holds the base64 itself, which is what survives a reload.
 * Browsers cap `localStorage` at a few megabytes, so this is a preview surface: on a device
 * the photo is a file (`photo-file.ts`), and the file is what the record points at.
 */

/** The image travels inside the record. */
export async function keepPhotoFile(photo: PickedPhoto) {
  return photo.dataUrl;
}

/** Nothing was written outside the record, so there is no file to clear. */
export function removePhotoFile(uri: string) {
  void uri;
}
