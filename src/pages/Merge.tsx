import { useEffect, useState } from "react";
import MergeUploadArea from "../components/MergeUploadArea";
import Button from "../components/Button";
import PDFMergeList, { type PDFItem } from "../components/PDFMergeList";
import ScrollArea from "../components/ScrollArea";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";
import { mergePDFs } from "../features/pdf/mergeService";

const Merge = () => {
  useEffect(() => {
    document.title = "Merge PDF | PDF Toolkit";
  }, []);

  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    setPdfs((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleMerge = async () => {
    setError(null);
    setMerging(true);
    try {
      await mergePDFs(pdfs);
    } catch (err) {
      console.error(err);
      setError(
        "This file is password-protected or unreadable and cannot be merged.",
      );
    } finally {
      setMerging(false);
    }
  };

  const isEmpty = pdfs.length === 0;
  const canMerge = pdfs.length >= 2 && !merging;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + List */}
        <div className="relative md:col-span-2 bg-white p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4">Merge PDF</h2>

          {pdfs.length === 0 && <MergeUploadArea onChange={handleUpload} />}

          {pdfs.length > 0 && (
            <div className="absolute top-4 right-4 z-10">
              <MergeUploadArea onChange={handleUpload} compact />
            </div>
          )}

          <ScrollArea className="md:flex-1 md:min-h-0 mt-4">
            <PDFMergeList items={pdfs} setItems={setPdfs} />
          </ScrollArea>

          <PrivacyNote />
        </div>

        {/* RIGHT: Actions */}
        <SidePanel disabled={isEmpty} overlayText="Please choose files first">
            <h2 className="text-xl font-semibold mb-4">Merge</h2>

              <p className="text-sm text-gray-600 mb-4">
                Files will be combined in the order shown on the left. Drag
                cards to reorder.
              </p>

              <p className="text-sm text-gray-500 mb-6">
                {pdfs.length} file{pdfs.length === 1 ? "" : "s"} selected
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full cursor-pointer"
                loading={merging}
                disabled={!canMerge}
                onClick={handleMerge}
              >
                Merge &amp; Download
              </Button>
        </SidePanel>
      </div>
    </div>
  );
};

export default Merge;