import { useState, useCallback, useEffect, useRef } from "react";
import UploadArea from "../components/UploadArea";
import Button from "../components/Button";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";
import {
  compressImagesToTargetSize,
  compressImagesByQuality,
  downloadCompressResults,
  getImageDimensions,
  type CompressResult,
} from "../features/pdf/imageCompressService";

type ImageItem = {
  id: string;
  file: File;
  dimensions?: { width: number; height: number };
  originalSizeKB: number;
};

type CompressMode = "size" | "quality";

const QUALITY_PRESETS: { label: string; value: number }[] = [
  { label: "High (90%)", value: 0.9 },
  { label: "Medium (70%)", value: 0.7 },
  { label: "Low (50%)", value: 0.5 },
];

const ImageCompress = () => {
  useEffect(() => {
    document.title = "Compress Image | PDF Toolkit";
  }, []);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [scope, setScope] = useState<"current" | "all">("all");
  const [downloadScope, setDownloadScope] = useState<"selected" | "all">("all");
  const [mode, setMode] = useState<CompressMode>("size");
  const [targetSizeKB, setTargetSizeKB] = useState(100);
  const [quality, setQuality] = useState(1);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<string, { name: string; sizeKB: number }>
  >({});

  const effectiveCurrentId = currentId ?? images[0]?.id ?? null;
  const currentImage =
    images.find((img) => img.id === effectiveCurrentId) ?? images[0] ?? null;

  const handleUpload = useCallback(async (files: File[]) => {
    setError(null);
    const newFiles = await Promise.all(
      files.map(async (file) => {
        const dimensions = await getImageDimensions(file).catch(
          () => undefined,
        );
        return {
          id: crypto.randomUUID(),
          file,
          dimensions,
          originalSizeKB: Math.round(file.size / 1024),
        };
      }),
    );
    setImages((prev) => [...prev, ...newFiles]);
    setCurrentId((curr) => curr ?? newFiles[0]?.id ?? null);
  }, []);

  const removeImage = useCallback(
    (id: string) => {
      const idx = images.findIndex((img) => img.id === id);
      const next = images.filter((img) => img.id !== id);
      setImages(next);
      setResults((prev) => {
        if (!prev[id]) return prev;
        const r = { ...prev };
        delete r[id];
        return r;
      });
      if (currentId === id) {
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        setCurrentId(fallback ? fallback.id : null);
      }
    },
    [images, currentId],
  );

  const handleCompress = async () => {
    if (images.length === 0) return;

    setError(null);
    setCompressing(true);

    try {
      const targets =
        scope === "current" ? (currentImage ? [currentImage] : []) : images;

      const files = targets.map((img) => img.file);
      if (files.length === 0) return;

      const compressed: CompressResult[] =
        mode === "size"
          ? await compressImagesToTargetSize(files, targetSizeKB)
          : await compressImagesByQuality(files, quality);

      const next: Record<string, { name: string; sizeKB: number }> = {};
      const byId = new Map<string, CompressResult>();
      targets.forEach((img, i) => {
        next[img.id] = {
          name: compressed[i].name,
          sizeKB: Math.round(compressed[i].blob.size / 1024),
        };
        byId.set(img.id, compressed[i]);
      });
      setResults(next);

      const downloadList =
        downloadScope === "selected" && currentImage
          ? byId.has(currentImage.id)
            ? [byId.get(currentImage.id)!]
            : []
          : compressed;
      await downloadCompressResults(downloadList, "images");
    } catch (err) {
      console.error(err);
      setError("Failed to compress images. Please try again.");
    } finally {
      setCompressing(false);
    }
  };

  const clearAll = useCallback(() => {
    setImages([]);
    setCurrentId(null);
    setResults({});
  }, []);

  useEffect(() => {
    setDownloadScope(images.length <= 1 ? "selected" : "all");
  }, [images.length]);

  const isDisabled = images.length === 0 || compressing;
  const activeImages =
    downloadScope === "selected"
      ? currentImage
        ? [currentImage]
        : []
      : images;
  const totalOriginalSize = activeImages.reduce(
    (sum, img) => sum + img.originalSizeKB,
    0,
  );
  const estimatedTotalSize =
    mode === "size" ? activeImages.length * targetSizeKB : undefined;

  // Max target size is the original size: you can only decrease, never increase.
  // It's based on the currently selected image so the value reflects what you
  // actually have highlighted, not an unrelated image.
  const refImage = currentImage ?? images[0] ?? null;
  const maxTargetKB = refImage ? Math.max(1, refImage.originalSizeKB) : 100;

  const targetTouched = useRef(false);

  useEffect(() => {
    setTargetSizeKB((prev) => {
      if (!targetTouched.current) return maxTargetKB;
      return Math.min(prev, maxTargetKB);
    });
  }, [maxTargetKB]);

  const setTargetSize = (value: number) => {
    targetTouched.current = true;
    setTargetSizeKB(Math.min(Math.max(1, Math.round(value)), maxTargetKB));
  };

  const sizePresets = [0.25, 0.5, 0.75, 1].map((f) =>
    Math.max(1, Math.round((maxTargetKB * f) / 5) * 5),
  );

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      {compressing && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80 backdrop-blur-sm">
          <span className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Compressing images…
          </p>
        </div>
      )}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + Preview */}
        <div className="relative md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Compress Images
          </h2>

          {images.length === 0 && <UploadArea onChange={handleUpload} />}

          {images.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <UploadArea onChange={handleUpload} compact />
            </div>
          )}

          {/* Preview List */}
          <div className="md:flex-1 md:min-h-0 mt-4 overflow-y-auto max-h-[60vh]">
            {images.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {images.length} image{images.length !== 1 ? "s" : ""}{" "}
                    selected
                  </h3>
                  <Button variant="secondary" size="sm" onClick={clearAll}>
                    Clear All
                  </Button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {images.map((img) => {
                    const isCurrent = img.id === effectiveCurrentId;
                    return (
                      <div
                        key={img.id}
                        onClick={() => setCurrentId(img.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          isCurrent
                            ? "border-brand-600 bg-brand-50"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {/* selection radio */}
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            isCurrent
                              ? "border-brand-600"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-brand-600" />
                          )}
                        </span>

                        <div className="w-16 h-16 flex-shrink-0 bg-white rounded border overflow-hidden relative">
                          {img.file.type.startsWith("image/") && (
                            <img
                              src={URL.createObjectURL(img.file)}
                              alt={img.file.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-medium text-black truncate">
                            {img.file.name}
                          </p>
                          {results[img.id] ? (
                            <p className="text-xs text-gray-500">
                              {img.originalSizeKB} KB →{" "}
                              <span className="font-medium text-green-600">
                                {results[img.id].sizeKB} KB
                              </span>{" "}
                              (
                              {Math.max(
                                0,
                                Math.round(
                                  (1 -
                                    results[img.id].sizeKB /
                                      img.originalSizeKB) *
                                    100,
                                ),
                              )}
                              % smaller)
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {img.dimensions
                                ? `${img.dimensions.width} × ${img.dimensions.height}px • `
                                : ""}
                              {img.originalSizeKB} KB
                            </p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1"
                          aria-label="Remove image"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <PrivacyNote />
        </div>

        {/* RIGHT: Settings */}
        <SidePanel
          disabled={isDisabled}
          overlayText="Please choose images first"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Settings
          </h2>

          {/* Mode toggle */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 block mb-2">
              Compression Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("size")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition cursor-pointer ${
                  mode === "size"
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                By Size (KB)
              </button>
              <button
                type="button"
                onClick={() => setMode("quality")}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition cursor-pointer ${
                  mode === "quality"
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                By Quality
              </button>
            </div>
          </div>

          {/* Apply compress to: current vs all */}
          <div className="mb-6 p-3 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <label className="text-sm text-gray-500 block mb-2">
              Apply compress to
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="compress-scope"
                  checked={scope === "current"}
                  onChange={() => setScope("current")}
                  style={{ colorScheme: "light" }}
                  className="accent-brand-600 cursor-pointer"
                />
                Current image
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="compress-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  style={{ colorScheme: "light" }}
                  className="accent-brand-600 cursor-pointer"
                />
                All images
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {scope === "current"
                ? currentImage
                  ? `Compressing: ${currentImage.file.name}`
                  : "No image selected"
                : `Compressing all ${images.length} image${images.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Target Size (KB) */}
          {mode === "size" && (
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-2">
                Target Size:{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {targetSizeKB} KB
                </span>
              </label>

              <input
                type="range"
                min={1}
                max={maxTargetKB}
                value={targetSizeKB}
                onChange={(e) => setTargetSize(Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{ colorScheme: "light" }}
              />

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 KB</span>
                <span>{maxTargetKB} KB</span>
              </div>

              {/* Manual KB input */}
              <div className="mt-3">
                <label className="text-xs text-gray-500 block mb-1">
                  Manual input (KB)
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxTargetKB}
                  value={targetSizeKB}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) {
                      setTargetSize(v);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="flex gap-2 mt-3">
                {sizePresets.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTargetSize(size)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                      targetSizeKB === size
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {size} KB
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Max is the original size of the selected image ({maxTargetKB}{" "}
                KB) — target can only be smaller.
              </p>
            </div>
          )}

          {/* Quality */}
          {mode === "quality" && (
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-2">
                Quality:{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(quality * 100)}%
                </span>
              </label>

              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(quality * 100)}
                onChange={(e) => setQuality(Number(e.target.value) / 100)}
                className="w-full cursor-pointer"
                style={{ colorScheme: "light" }}
              />

              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10%</span>
                <span>100%</span>
              </div>

              {/* Quality preset buttons */}
              <div className="flex gap-2 mt-3">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setQuality(preset.value)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                      quality === preset.value
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          {images.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Estimated Results
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">
                    Original Total
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {totalOriginalSize} KB
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Est. Compressed</p>
                  <p className="font-semibold text-brand-600">
                    {estimatedTotalSize !== undefined
                      ? `~${estimatedTotalSize} KB`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Reduction</p>
                  <p className="font-semibold text-green-600">
                    {estimatedTotalSize !== undefined && totalOriginalSize > 0
                      ? `~${Math.round((1 - estimatedTotalSize / totalOriginalSize) * 100)}%`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {mode === "size" ? "Per Image" : "Quality"}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {mode === "size"
                      ? `${targetSizeKB} KB`
                      : `${Math.round(quality * 100)}%`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 p-3 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <label className="text-sm text-gray-500 block mb-2">Download</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="download-scope"
                  checked={downloadScope === "selected"}
                  onChange={() => setDownloadScope("selected")}
                  style={{ colorScheme: "light" }}
                  className="accent-brand-600 cursor-pointer"
                />
                Selected image
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer">
                <input
                  type="radio"
                  name="download-scope"
                  checked={downloadScope === "all"}
                  onChange={() => setDownloadScope("all")}
                  style={{ colorScheme: "light" }}
                  className="accent-brand-600 cursor-pointer"
                />
                All images
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {downloadScope === "selected"
                ? currentImage
                  ? `Will download: ${currentImage.file.name}`
                  : "No image selected"
                : `Will download all ${scope === "all" ? images.length : 1} compressed image${
                    (scope === "all" ? images.length : 1) !== 1 ? "s" : ""
                  } (ZIP)`}
            </p>
          </div>

          <Button
            variant="secondary"
            className="w-full cursor-pointer"
            loading={compressing}
            disabled={isDisabled}
            onClick={handleCompress}
          >
            {downloadScope === "selected"
              ? "Compress & Download"
              : (scope === "all" ? images.length : 1) > 1
                ? "Compress All & Download (ZIP)"
                : "Compress All & Download"}
          </Button>
        </SidePanel>
      </div>
    </div>
  );
};

export default ImageCompress;
