import { PDFDocument } from "pdf-lib";

/** Signature placement in PDF user-space points (bottom-left origin). */
export interface SignaturePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Convert a data URL to bytes for pdf-lib. */
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.includes("base64,")
    ? dataUrl.split("base64,")[1]
    : dataUrl;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** Normalize any image (canvas, PNG, JPG, WebP...) to a PNG data URL. */
export const toPngDataUrl = (source: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = source;
  });

/** Load an image and return its width/height ratio (w/h). */
export const getImageRatio = (dataUrl: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve(
        img.naturalWidth / img.naturalHeight || 1,
      );
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });

/** Make white pixels transparent. `threshold` 0–1: higher = more white removed. */
export const removeWhite = (dataUrl: string, threshold: number): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const limit = 255 * (1 - threshold);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= limit && g >= limit && b >= limit) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
        },
        "image/png",
      );
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });

/** Same as removeWhite but returns a data URL for preview. */
export const removeWhitePreview = (
  dataUrl: string,
  threshold: number,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const limit = 255 * (1 - threshold);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= limit && g >= limit && b >= limit) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });

/**
 * Embed `signatureDataUrl` (PNG) on every page listed in `placements`
 * (keyed by 1-based page number) and download the result.
 */
export const signPdf = async (
  file: File,
  signatureDataUrl: string,
  placements: Map<number, SignaturePlacement>,
  opacity: number = 1,
): Promise<void> => {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });

  let imageBytes: Uint8Array;
  if (opacity < 1) {
    imageBytes = await removeWhite(signatureDataUrl, 1 - opacity);
  } else {
    imageBytes = dataUrlToBytes(signatureDataUrl);
  }
  const image = await pdf.embedPng(imageBytes);

  pdf.getPages().forEach((page, index) => {
    const p = placements.get(index + 1);
    if (!p) return;

    const { width: pageW, height: pageH } = page.getSize();

    // Clamp placement to the page bounds.
    const w = Math.min(p.width, pageW);
    const h = Math.min(p.height, pageH);
    const x = Math.max(0, Math.min(p.x, pageW - w));
    const y = Math.max(0, Math.min(p.y, pageH - h));

    page.drawImage(image, { x, y, width: w, height: h });
  });

  const out = await pdf.save();
  const blob = new Blob([new Uint8Array(out)], { type: "application/pdf" });
  const baseName = file.name.replace(/\.[^/.]+$/, "") || "signed";
  triggerDownload(blob, `${baseName}-signed.pdf`);
};
