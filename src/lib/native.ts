import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Media } from '@capacitor-community/media';

// Check if we're running in a native app context
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';

// Track saved image paths for potential deletion
let lastSavedImagePaths: string[] = [];

// Camera functions
export async function takePhoto(): Promise<Photo> {
  return Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    saveToGallery: false, // Don't save to gallery, we'll manage storage ourselves
  });
}

export async function pickFromGallery(): Promise<Photo> {
  return Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
  });
}

export async function pickMultipleFromGallery(): Promise<GalleryPhoto[]> {
  const result = await Camera.pickImages({
    quality: 90,
    limit: 5, // Max 5 photos per item
  });
  return result.photos;
}

// Resize image to max dimension while maintaining aspect ratio
async function resizeImage(blob: Blob, maxSize: number = 1200, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than maxSize
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob);
          } else {
            reject(new Error('Could not resize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = URL.createObjectURL(blob);
  });
}

// Convert Photo or GalleryPhoto to File for upload (with compression)
export async function photoToFile(photo: Photo | GalleryPhoto, filename?: string): Promise<File> {
  if (!photo.webPath) {
    throw new Error('No web path available for photo');
  }

  const response = await fetch(photo.webPath);
  const blob = await response.blob();

  // Resize to max 1200px and compress to 80% quality
  const resizedBlob = await resizeImage(blob, 1200, 0.8);

  const name = filename || `photo_${Date.now()}.jpeg`;
  return new File([resizedBlob], name, { type: 'image/jpeg' });
}

// Get or create album for saving photos
async function getOrCreateAlbum(): Promise<string> {
  try {
    const albums = await Media.getAlbums();
    console.log('[NATIVE] Available albums:', albums.albums.map(a => a.name));

    // Try to find Camera or DCIM album first (most recent photos location)
    const preferredAlbums = ['Camera', 'DCIM', 'Pictures', 'Download', 'Downloads'];
    for (const name of preferredAlbums) {
      const album = albums.albums.find(a => a.name.toLowerCase() === name.toLowerCase());
      if (album) {
        console.log('[NATIVE] Using existing album:', album.name);
        return album.identifier;
      }
    }

    // If no preferred album found, use the first user album
    if (albums.albums.length > 0) {
      console.log('[NATIVE] Using first available album:', albums.albums[0].name);
      return albums.albums[0].identifier;
    }

    // No albums exist, create one called "Pictures"
    console.log('[NATIVE] No albums found, creating Pictures album');
    await Media.createAlbum({ name: 'Pictures' });

    // Get the newly created album
    const newAlbums = await Media.getAlbums();
    const picturesAlbum = newAlbums.albums.find(a => a.name === 'Pictures');
    if (picturesAlbum) {
      return picturesAlbum.identifier;
    }

    throw new Error('Could not create or find album');
  } catch (error) {
    console.error('[NATIVE] Error getting/creating album:', error);
    throw error;
  }
}

// Save multiple images to gallery (will appear as recent photos)
export async function saveImagesToGallery(imageUrls: string[]): Promise<void> {
  if (!isNative()) {
    return;
  }

  lastSavedImagePaths = [];

  try {
    // Get or create album to save to (required on Android)
    const albumId = await getOrCreateAlbum();
    console.log('[NATIVE] Saving', imageUrls.length, 'images to album:', albumId);

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log('[NATIVE] Fetching image', i + 1, ':', imageUrl.substring(0, 50) + '...');

      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      const filename = `ormar_${Date.now()}_${i}.jpg`;
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      console.log('[NATIVE] Temp file saved:', savedFile.uri);

      // Save to gallery using Media plugin
      const result = await Media.savePhoto({
        path: savedFile.uri,
        albumIdentifier: albumId,
        fileName: `ormar_${Date.now()}_${i}`,
      });

      console.log('[NATIVE] Saved to gallery:', result);

      // Track the saved path for potential deletion
      if (result.filePath) {
        lastSavedImagePaths.push(result.filePath);
      }

      // Clean up cache file
      try {
        await Filesystem.deleteFile({ path: filename, directory: Directory.Cache });
      } catch {
        // Ignore cleanup errors
      }
    }

    console.log('[NATIVE] Saved', lastSavedImagePaths.length, 'images to gallery');
  } catch (error) {
    console.error('[NATIVE] Error saving images to gallery:', error);
    throw error;
  }
}

// Delete the last saved images from gallery
export async function deleteLastSavedImages(): Promise<{ deleted: number; failed: number }> {
  if (!isNative() || lastSavedImagePaths.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (const filePath of lastSavedImagePaths) {
    try {
      // On Android, filePath is the actual filesystem path
      // Use Filesystem plugin to delete
      await Filesystem.deleteFile({ path: filePath });
      deleted++;
    } catch (error) {
      console.error('Failed to delete image:', filePath, error);
      failed++;
    }
  }

  // Clear the tracked paths
  lastSavedImagePaths = [];

  return { deleted, failed };
}

// Get count of images pending deletion
export function getLastSavedImagesCount(): number {
  return lastSavedImagePaths.length;
}

// Clipboard functions
export async function copyToClipboard(text: string): Promise<void> {
  if (isNative()) {
    await Clipboard.write({ string: text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

export async function readFromClipboard(): Promise<string> {
  if (isNative()) {
    const result = await Clipboard.read();
    return result.value;
  } else {
    return navigator.clipboard.readText();
  }
}

// Open Facebook app directly (no share sheet)
export async function openFacebook(): Promise<void> {
  if (isNative()) {
    // Open Facebook app using deep link
    window.location.href = 'fb://feed';
    // Give it a moment to open, then the app will handle the return
  } else {
    window.open('https://www.facebook.com', '_blank');
  }
}

// Utility to convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// File management
export async function readFile(path: string): Promise<string> {
  const result = await Filesystem.readFile({
    path,
    encoding: Encoding.UTF8,
  });
  return result.data as string;
}

export async function writeFile(path: string, data: string): Promise<void> {
  await Filesystem.writeFile({
    path,
    data,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
}

export async function deleteFile(path: string): Promise<void> {
  await Filesystem.deleteFile({
    path,
    directory: Directory.Data,
  });
}

// Get file URI that can be used in img src
export function getFileUri(path: string): string {
  return Capacitor.convertFileSrc(path);
}
