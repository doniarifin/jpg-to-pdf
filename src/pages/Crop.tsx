import { useCallback, useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import MergeUploadArea from "../components/MergeUploadArea";
import Button from "../components/Button";
import PDFThumbnail from "../components/PDFThumbnail";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";
import CropCanvas from "../components/CropCanvas";
import { cropPdf, type CropRect } from "../features/pdf/cropService";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

const loadPageCount = async (file: File): Promise<number> => {
  const data = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data });
  const pdf = await task.promise;
  const n = pdf.numPages;
  task.destroy().catch(() => {});
  return n;
};

const PT_TO_MM = 25.4 / 72;

const Crop = () => {
  useEffect(() => {
    document.title = "Crop PDF | PDF Toolkit";
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [crops, setCrops] = useState<Map<number, CropRect>>(new Map());
  const [pageDims, setPageDims] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [cropping, setCropping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"current" | "all">("current");

  const handleUpload = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPageNumber(1);
    setCrops(new Map());
    setPageDims(null);
    try {
      setNumPages(await loadPageCount(f));
    } catch {
      setError("Could not read this PDF.");
      setNumPages(0);
    }
  };

  const updateCrop = useCallback(
    (rect: CropRect | null) => {
      setCrops((prev) => {
        if (scope === "all") {
          const next = new Map<number, CropRect>();
          if (rect) for (let i = 1; i <= numPages; i++) next.set(i, rect);
          return next;
        }
        const next = new Map(prev);
        if (rect) next.set(pageNumber, rect);
        else next.delete(pageNumber);
        return next;
      });
    },
    [pageNumber, numPages, scope],
  );

  const handlePageInfo = useCallback((w: number, h: number) => {
    setPageDims((prev) =>
      prev && prev.w === w && prev.h === h ? prev : { w, h },
    );
  }, []);

  const changeScope = (next: "current" | "all") => {
    setScope(next);
    if (next === "all") {
      const cur = crops.get(pageNumber);
      if (cur) {
        const nextMap = new Map<number, CropRect>();
        for (let i = 1; i <= numPages; i++) nextMap.set(i, cur);
        setCrops(nextMap);
      }
    }
  };

  const resetPage = () => updateCrop(null);

  const handleCrop = async () => {
    if (!file) return;
    setError(null);
    setCropping(true);
    try {
      await cropPdf(file, crops);
    } catch (err) {
      console.error(err);
      setError("This file is password-protected or unreadable and cannot be cropped.");
    } finally {
      setCropping(false);
    }
  };

  const isDisabled = !file;
  const currentCrop = crops.get(pageNumber) ?? null;
  const croppedCount = crops.size;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + Preview */}
        <div className="relative md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Crop PDF</h2>

          {!file && <MergeUploadArea onChange={handleUpload} />}

          {file && (
            <div className="absolute top-4 right-4 z-10">
              <MergeUploadArea onChange={handleUpload} compact />
            </div>
          )}

          <div className="md:flex-1 md:min-h-0 mt-4 flex flex-col min-h-0">
          {file && (
            <>
              {/* Page navigation */}
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {pageNumber} / {numPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPageNumber((p) => Math.min(numPages, p + 1))
                  }
                  disabled={pageNumber >= numPages}
                  className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Next
                </button>
              </div>

              {/* Interactive crop canvas */}
              <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center rounded-xl bg-gray-100 dark:bg-gray-800 p-4">
                <CropCanvas
                  file={file}
                  pageNumber={pageNumber}
                  crop={currentCrop}
                  onCropChange={updateCrop}
                  onPageInfo={handlePageInfo}
                />
              </div>

              {/* Thumbnail strip */}
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPageNumber(n)}
                    className={`relative shrink-0 rounded-md border-2 overflow-hidden transition ${
                      n === pageNumber
                        ? "border-brand-600"
                        : "border-transparent dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <PDFThumbnail file={file} className="w-14 h-auto block" />
                    {crops.has(n) && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          </div>

          <PrivacyNote />
        </div>

        {/* RIGHT: Settings */}
        <SidePanel disabled={isDisabled} overlayText="Please choose a file first">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Crop</h2>

          <p className="text-sm text-gray-500 mb-2">
            Page {pageNumber} of {numPages}
          </p>

          {currentCrop && pageDims ? (
            <div className="mb-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200">
              <p>
                Size:{" "}
                {(currentCrop.width * PT_TO_MM).toFixed(1)} ×{" "}
                {(currentCrop.height * PT_TO_MM).toFixed(1)} mm
              </p>
              <p className="text-gray-500 mt-1">
                {((currentCrop.width / pageDims.w) * 100).toFixed(0)}% ×{" "}
                {((currentCrop.height / pageDims.h) * 100).toFixed(0)}% of page
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              Drag on the page to select the area to keep.
            </p>
          )}

          <div className="mb-6">
            <label className="text-sm text-gray-500">Apply crop to</label>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="crop-scope"
                  checked={scope === "current"}
                  onChange={() => changeScope("current")}
                  className="accent-brand-600 cursor-pointer"
                  style={{ colorScheme: "light" }}
                />
                Current page
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="crop-scope"
                  checked={scope === "all"}
                  onChange={() => changeScope("all")}
                  className="accent-brand-600 cursor-pointer"
                  style={{ colorScheme: "light" }}
                />
                All pages
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <Button
              variant="secondary"
              className="w-full cursor-pointer"
              disabled={!currentCrop}
              onClick={resetPage}
            >
              {scope === "all" ? "Reset all pages" : "Reset this page"}
            </Button>
          </div>

          <p className="text-sm text-gray-500 mb-2">
            {croppedCount} of {numPages} page{croppedCount === 1 ? "" : "s"}{" "}
            cropped
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full cursor-pointer"
            loading={cropping}
            disabled={isDisabled || cropping}
            onClick={handleCrop}
          >
            Crop &amp; Download
          </Button>
        </SidePanel>
      </div>
    </div>
  );
};

export default Crop;
