import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

export type ImageQuality = "high" | "medium" | "low";

interface QualitySetting {
  scale: number;
  quality: number;
}

const QUALITY_MAP: Record<ImageQuality, QualitySetting> = {
  high: { scale: 2.5, quality: 0.95 },
  medium: { scale: 1.5, quality: 0.8 },
  low: { scale: 1, quality: 0.6 },
};

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to render page to image."));
      },
      "image/jpeg",
      quality,
    );
  });

export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const renderPdfPages = async (
  file: File,
  scale: number,
  jpegQuality: number,
): Promise<{ name: string; blob: Blob }[]> => {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;

  const baseName = file.name.replace(/\.[^/.]+$/, "") || "output";
  const blobs: { name: string; blob: Blob }[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not supported.");

      await page.render({ canvasContext: context, canvas, viewport }).promise;

      const blob = await canvasToBlob(canvas, jpegQuality);
      blobs.push({ name: `${baseName}-page-${pageNum}.jpg`, blob });
    }
  } finally {
    await loadingTask.destroy().catch(() => {});
  }

  return blobs;
};

/**
 * Convert every page of one or more PDF files into JPG images.
 * A single resulting image downloads as one .jpg; multiple images are
 * bundled into a .zip.
 */
export const convertPdfToJpg = async (
  files: File[],
  quality: ImageQuality,
): Promise<void> => {
  const { scale, quality: jpegQuality } = QUALITY_MAP[quality];

  const blobs: { name: string; blob: Blob }[] = [];
  for (const file of files) {
    const pageBlobs = await renderPdfPages(file, scale, jpegQuality);
    blobs.push(...pageBlobs);
  }

  if (blobs.length === 0) return;

  if (blobs.length === 1) {
    triggerDownload(blobs[0].blob, blobs[0].name);
    return;
  }

  const zip = new JSZip();
  const seen = new Map<string, number>();
  blobs.forEach(({ name, blob }) => {
    // Guard against duplicate names when multiple PDFs share a base name.
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    const finalName = count === 0 ? name : name.replace(/\.jpg$/, `-${count}.jpg`);
    zip.file(finalName, blob);
  });
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const zipBase = files[0]?.name.replace(/\.[^/.]+$/, "") || "output";
  triggerDownload(zipBlob, `${zipBase}-images.zip`);
};
