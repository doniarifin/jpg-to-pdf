import JSZip from "jszip";
import { triggerDownload } from "./pdfToImageService";

export type CompressResult = { name: string; blob: Blob };

/**
 * Download a list of compressed results. A single result downloads directly as
 * a .jpg; multiple results are bundled into a .zip (duplicate names get a
 * "-N" suffix, mirroring pdfToImageService).
 */
export const downloadCompressResults = async (
  results: CompressResult[],
  zipBaseName: string,
): Promise<void> => {
  if (results.length === 0) return;

  if (results.length === 1) {
    triggerDownload(results[0].blob, results[0].name);
    return;
  }

  const zip = new JSZip();
  const seen = new Map<string, number>();
  results.forEach(({ name, blob }) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    const finalName = count === 0 ? name : name.replace(/(\.[^.]+)$/, `-${count}$1`);
    zip.file(finalName, blob);
  });
  const zipBlob = await zip.generateAsync({ type: "blob" });
  triggerDownload(zipBlob, `${zipBaseName}-compressed.zip`);
};

/**
 * Compress an image to a target file size in KB
 * Uses binary search to find the optimal quality setting
 */
export const compressImageToTargetSize = async (
  file: File,
  targetSizeKB: number,
  maxIterations: number = 15
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not supported"));
      return;
    }

    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Binary search for optimal quality
      let minQuality = 0.01;
      let maxQuality = 1.0;
      let bestBlob: Blob | null = null;

      const targetSizeBytes = targetSizeKB * 1024;
      
      const tryQuality = (quality: number): Promise<Blob> => {
        return new Promise((resolveBlob) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolveBlob(blob);
            } else {
              resolveBlob(new Blob());
            }
          }, "image/jpeg", quality);
        });
      };
      
      const binarySearch = async (iteration: number) => {
        if (iteration >= maxIterations) {
          if (bestBlob) {
            resolve(bestBlob);
          } else {
            // Fallback to lowest quality
            const fallbackBlob = await tryQuality(minQuality);
            resolve(fallbackBlob);
          }
          return;
        }
        
        const midQuality = (minQuality + maxQuality) / 2;
        const blob = await tryQuality(midQuality);
        
        if (blob.size <= targetSizeBytes) {
          // Quality is good, try higher quality
          bestBlob = blob;
          minQuality = midQuality;
        } else {
          // File too large, try lower quality
          maxQuality = midQuality;
        }
        
        // Check if we're close enough
        if (bestBlob && Math.abs(bestBlob.size - targetSizeBytes) < targetSizeBytes * 0.02) {
          resolve(bestBlob);
          return;
        }
        
        await binarySearch(iteration + 1);
      };
      
      binarySearch(0);
    };
    
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress an image by a fixed quality (0-1) without targeting a size.
 * Output is always JPEG.
 */
export const compressImageByQuality = async (
  file: File,
  quality: number
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not supported"));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress multiple images by a fixed quality. Returns results in the same
 * order as the input files (no download is performed here).
 */
export const compressImagesByQuality = async (
  files: File[],
  quality: number
): Promise<CompressResult[]> => {
  const results: CompressResult[] = [];
  for (const file of files) {
    try {
      const compressedBlob = await compressImageByQuality(file, quality);
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "compressed";
      results.push({ name: `${baseName}-q${Math.round(quality * 100)}.jpg`, blob: compressedBlob });
    } catch (error) {
      console.error(`Failed to compress ${file.name}:`, error);
      // Fallback: keep the original
      results.push({ name: file.name, blob: file });
    }
  }
  return results;
};

/**
 * Compress multiple images to target size. Returns results in the same order
 * as the input files (no download is performed here).
 */
export const compressImagesToTargetSize = async (
  files: File[],
  targetSizeKB: number
): Promise<CompressResult[]> => {
  const results: CompressResult[] = [];
  for (const file of files) {
    const originalSizeKB = Math.round(file.size / 1024);
    try {
      // Never enlarge an image: if the chosen target is not smaller than the
      // image's own original/max size, keep the original untouched.
      if (originalSizeKB <= targetSizeKB) {
        results.push({ name: file.name, blob: file });
        continue;
      }
      const compressedBlob = await compressImageToTargetSize(file, targetSizeKB);
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "compressed";
      results.push({ name: `${baseName}-compressed.jpg`, blob: compressedBlob });
    } catch (error) {
      console.error(`Failed to compress ${file.name}:`, error);
      // Fallback: keep the original
      results.push({ name: file.name, blob: file });
    }
  }
  return results;
};

/**
 * Get estimated compressed size at a given quality
 */
export const estimateCompressedSize = async (
  file: File,
  quality: number
): Promise<number> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not supported"));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob.size);
        } else {
          resolve(0);
        }
      }, "image/jpeg", quality);
    };
    
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};