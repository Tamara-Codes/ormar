import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo, GalleryPhoto } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Media } from '@capacitor-community/media';

// Check if we're running in a native app context
export const isNative = () => Capacitor.isNativePlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';

// Album name for temp photos
const ORMAR_ALBUM = 'Ormar';

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

// Create Ormar album if it doesn't exist
async function ensureOrmarAlbum(): Promise<string> {
  try {
    const albums = await Media.getAlbums();
    const ormarAlbum = albums.albums.find(a => a.name === ORMAR_ALBUM);

    if (ormarAlbum) {
      return ormarAlbum.identifier;
    }

    // Create the album
    await Media.createAlbum({ name: ORMAR_ALBUM });
    const newAlbums = await Media.getAlbums();
    const newOrmarAlbum = newAlbums.albums.find(a => a.name === ORMAR_ALBUM);

    if (newOrmarAlbum) {
      return newOrmarAlbum.identifier;
    }

    throw new Error('Could not create Ormar album');
  } catch (error) {
    console.error('Error ensuring Ormar album:', error);
    throw error;
  }
}

// Save multiple images to Ormar album for FB posting
export async function saveImagesToOrmarAlbum(imageUrls: string[]): Promise<void> {
  if (!isNative()) {
    return;
  }

  try {
    const albumIdentifier = await ensureOrmarAlbum();

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);

      const filename = `ormar_${Date.now()}_${i}.jpg`;
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      await Media.savePhoto({
        path: savedFile.uri,
        albumIdentifier,
      });

      // Clean up cache file
      try {
        await Filesystem.deleteFile({ path: filename, directory: Directory.Cache });
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.error('Error saving images to album:', error);
    throw error;
  }
}

// Clear Ormar album - note: Android doesn't allow apps to delete gallery photos without user consent
// The images will remain in the Ormar album but this is expected behavior
export async function clearOrmarAlbum(): Promise<void> {
  if (!isNative()) {
    return;
  }
  // Note: Deleting photos from gallery requires user consent on Android
  // The Ormar album will persist with the shared images
  console.log('[NATIVE] Ormar album cleanup requested - images remain in gallery');
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
