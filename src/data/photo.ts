import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { keepPhotoFile, removePhotoFile } from '@/data/photo-file';

/**
 * The photo a record keeps: where it comes from, what is kept of it, and where it is filed.
 *
 * A medicine pack and a lab report are photographed the same way — full size, shrunk to
 * something a model can read in one request, kept beside the database. The shrunk image is
 * also the data URL that goes to the AI; the original never does.
 */
export type PickedPhoto = {
  /** What the form shows, and what is kept with the record. */
  preview: string;
  /** A JPEG data URL, for the one call that reads it. */
  dataUrl: string;
};

/** The folder a photo is filed in: the app's own, one per kind of record. */
export type PhotoFolder = 'medicines' | 'reports';

/** The longest edge sent to the model: enough to read a label, small enough to send. */
const MAX_EDGE = 1024;
const QUALITY = 0.7;

/** Photograph something, or choose a picture of it. `null` when the user backs out. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
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

/** Keep the photo with the record it belongs to. */
export function keepPhoto(photo: PickedPhoto, id: string, folder: PhotoFolder) {
  return keepPhotoFile(photo, id, folder);
}

/** Take the photo with the record when the record goes. */
export function forgetPhoto(uri: string) {
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
