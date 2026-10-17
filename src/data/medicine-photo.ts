import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { keepPhotoFile, removePhotoFile } from '@/data/photo-file';

/**
 * The pack photo: where it comes from and what is kept of it.
 *
 * A pack is photographed (or chosen) at full size, shrunk to something a model can read
 * in one request, and kept with the record. The shrunk image is also the data URL that
 * goes to the AI — the original never does.
 */
export type PickedPhoto = {
  /** What the form shows, and what is kept with the record. */
  preview: string;
  /** A JPEG data URL, for the one call that reads the pack. */
  dataUrl: string;
};

/** The longest edge sent to the model: enough to read a label, small enough to send. */
const MAX_EDGE = 1024;
const QUALITY = 0.7;

/** Photograph a pack, or choose a picture of one. `null` when the user backs out. */
export async function pickMedicinePhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  await askFor(source);

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });

  const asset = result.canceled ? null : result.assets[0];

  if (!asset) return null;

  const image = ImageManipulator.manipulate(asset.uri);

  // Scale by the longest edge, computed here rather than left to the manipulator — its
  // web build reads a missing dimension as zero. Never enlarge: a small picture of a pack
  // is still a picture of a pack.
  const longest = Math.max(asset.width, asset.height);

  if (asset.width > 0 && asset.height > 0 && longest > MAX_EDGE) {
    const scale = MAX_EDGE / longest;

    image.resize({
      width: Math.round(asset.width * scale),
      height: Math.round(asset.height * scale),
    });
  }

  const rendered = await image.renderAsync();
  const shrunk = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: QUALITY,
    base64: true,
  });

  if (!shrunk.base64) throw new Error('That photo could not be read. Try another one.');

  return { preview: shrunk.uri, dataUrl: `data:image/jpeg;base64,${shrunk.base64}` };
}

/** Keep the photo with the medicine it belongs to. */
export function keepMedicinePhoto(photo: PickedPhoto, id: string) {
  return keepPhotoFile(photo, id);
}

/** Take the photo with the record when the record goes. */
export function forgetMedicinePhoto(uri: string) {
  removePhotoFile(uri);
}

/** Ask for the permission the source needs, naming it when it is refused. */
async function askFor(source: 'camera' | 'library') {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error(
      source === 'camera'
        ? 'The camera is switched off for Aushadh. Turn it on in Settings.'
        : 'Aushadh cannot reach your photos. Turn it on in Settings.',
    );
  }
}
