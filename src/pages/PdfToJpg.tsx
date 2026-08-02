import { useEffect, useState } from "react";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import MergeUploadArea from "../components/MergeUploadArea";
import Button from "../components/Button";
import PDFThumbnail from "../components/PDFThumbnail";
import ScrollArea from "../components/ScrollArea";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";
import {
  convertPdfToJpg,
  type ImageQuality,
} from "../features/pdf/pdfToImageService";

const QUALITY_OPTIONS: { value: ImageQuality; label: string; hint: string }[] = [
  { value: "high", label: "High", hint: "Sharpest, largest file" },
  { value: "medium", label: "Medium", hint: "Balanced size & quality" },
  { value: "low", label: "Low", hint: "Smallest file size" },
];

type PdfItem = { id: string; file: File };

const PdfToJpg = () => {
  useEffect(() => {
    document.title = "PDF to JPG | PDF Toolkit";
  }, []);

  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [quality, setQuality] = useState<ImageQuality>("medium");
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (files: File[]) => {
    if (files.length === 0) return;
    const newItems = files.map((file) => ({ id: crypto.randomUUID(), file }));
    setPdfs((prev) => [...prev, ...newItems]);
    setError(null);
  };

  const handleRemove = (id: string) => {
    setPdfs((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConvert = async () => {
    if (pdfs.length === 0) return;
    setError(null);
    setConverting(true);
    try {
      await convertPdfToJpg(
        pdfs.map((p) => p.file),
        quality,
      );
    } catch (err) {
      console.error(err);
      setError(
        "A file is password-protected or unreadable and cannot be converted.",
      );
    } finally {
      setConverting(false);
    }
  };

  const isDisabled = pdfs.length === 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + Preview */}
        <div className="relative md:col-span-2 bg-white p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4">PDF to JPG</h2>

          {pdfs.length === 0 && <MergeUploadArea onChange={handleUpload} />}

          {pdfs.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <MergeUploadArea onChange={handleUpload} compact />
            </div>
          )}

          <ScrollArea className="md:flex-1 md:min-h-0 mt-4">
            {pdfs.length > 0 && (
              <div className="bg-gray-200 p-4 rounded-xl mt-4 flex flex-wrap gap-3 justify-center">
                {pdfs.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white shadow-lg rounded-xl relative group w-40"
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      aria-label={`Remove ${item.file.name}`}
                      className="
                        absolute
                        top-2
                        right-2
                        z-10
                        w-6
                        h-6
                        rounded-full
                        bg-gray-100
                        border border-gray-300
                        flex items-center justify-center
                        shadow-[0_2px_4px_rgba(0,0,0,0.1)]
                        hover:bg-red-500
                        hover:text-white
                        cursor-pointer
                        active:scale-95
                        transition
                      "
                    >
                      <FontAwesomeIcon icon={faXmark} size="sm" />
                    </button>

                    <div className="p-4 flex flex-col items-center">
                      <div className="w-full mb-3 flex items-center justify-center h-32 overflow-hidden rounded-md bg-gray-50">
                        <PDFThumbnail
                          file={item.file}
                          className="h-32 w-auto object-contain"
                        />
                      </div>
                      <p className="text-sm text-gray-700 font-medium truncate max-w-full">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <PrivacyNote />
        </div>

        {/* RIGHT: Settings */}
        <SidePanel disabled={isDisabled} overlayText="Please choose a file first">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>

            {/* Quality */}
            <div className="mb-6">
              <label className="text-sm text-gray-500">Image Quality</label>
              <div className="flex flex-col gap-2 mt-2">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setQuality(opt.value)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                      quality === opt.value
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <span className="block font-medium">{opt.label}</span>
                    <span
                      className={`block text-xs ${
                        quality === opt.value
                          ? "text-white/80"
                          : "text-gray-500"
                      }`}
                    >
                      {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-2">
              {pdfs.length} file{pdfs.length === 1 ? "" : "s"} selected
            </p>

            <p className="text-sm text-gray-500 mb-6">
              Each PDF page becomes a JPG. Multiple images download as a .zip.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Convert */}
            <Button
              variant="secondary"
              className="w-full cursor-pointer"
              loading={converting}
              disabled={isDisabled || converting}
              onClick={handleConvert}
            >
              Convert to JPG
            </Button>
        </SidePanel>
      </div>
    </div>
  );
};

export default PdfToJpg;
