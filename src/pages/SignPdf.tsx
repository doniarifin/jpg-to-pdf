import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import MergeUploadArea from "../components/MergeUploadArea";
import Button from "../components/Button";
import PDFThumbnail from "../components/PDFThumbnail";
import PrivacyNote from "../components/PrivacyNote";
import SidePanel from "../components/SidePanel";
import SignatureDrawer from "../components/SignatureDrawer";
import SignaturePlaceCanvas from "../components/SignaturePlaceCanvas";
import {
  signPdf,
  toPngDataUrl,
  getImageRatio,
  type SignaturePlacement,
} from "../features/pdf/signatureService";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

const loadPageCount = async (file: File): Promise<number> => {
  const data = await file.arrayBuffer();
  const task = pdfjsLib.getDocument({ data });
  const pdf = await task.promise;
  const n = pdf.numPages;
  task.destroy().catch(() => {});
  return n;
};

const SignPdf = () => {
  useEffect(() => {
    document.title = "Sign PDF | PDF Toolkit";
  }, []);

  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureRatio, setSignatureRatio] = useState(2);
  const [signWidth, setSignWidth] = useState(150);
  const [placements, setPlacements] = useState<
    Map<number, SignaturePlacement>
  >(new Map());
  const [placing, setPlacing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPageNumber(1);
    setPlacements(new Map());
    setPlacing(false);
    try {
      setNumPages(await loadPageCount(f));
    } catch {
      setError("Could not read this PDF.");
      setNumPages(0);
    }
  };

  const setSignatureFromDataUrl = useCallback(async (dataUrl: string) => {
    try {
      const ratio = await getImageRatio(dataUrl);
      setSignature(dataUrl);
      setSignatureRatio(ratio || 1);
    } catch {
      setError("Could not load that signature image.");
    }
  }, []);

  const handleDrawSave = (dataUrl: string) => {
    setSignatureFromDataUrl(dataUrl);
  };

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result);
      try {
        setSignatureFromDataUrl(await toPngDataUrl(dataUrl));
      } catch {
        setError("Could not load that signature image.");
      }
    };
    reader.readAsDataURL(f);
  };

  const placeAt = (x: number, y: number) => {
    if (!signature) return;
    const w = signWidth;
    const h = signWidth / signatureRatio;
    setPlacements((prev) => {
      const next = new Map(prev);
      next.set(pageNumber, { x: x - w / 2, y: y - h / 2, width: w, height: h });
      return next;
    });
  };

  const removeCurrent = () => {
    setPlacements((prev) => {
      const next = new Map(prev);
      next.delete(pageNumber);
      return next;
    });
  };

  const handleSign = async () => {
    if (!file || !signature) return;
    setError(null);
    setSigning(true);
    try {
      await signPdf(file, signature, placements);
    } catch (err) {
      console.error(err);
      setError(
        "This file is password-protected or unreadable and cannot be signed.",
      );
    } finally {
      setSigning(false);
    }
  };

  const isDisabled = !file;
  const currentPlacement = placements.get(pageNumber) ?? null;
  const signedCount = placements.size;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden px-6 md:px-10 py-6 scroll-area">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:h-full">
        {/* Upload + Preview */}
        <div className="relative md:col-span-2 bg-white p-6 rounded-2xl shadow md:flex md:flex-col md:min-h-0">
          <h2 className="text-xl font-semibold mb-4">Sign PDF</h2>

          {!file && (
            <MergeUploadArea
              onChange={handleUpload}
              title="Click here to upload a PDF"
              hint="Choose a PDF file to sign"
            />
          )}

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
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-100"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pageNumber} / {numPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPageNumber((p) => Math.min(numPages, p + 1))
                    }
                    disabled={pageNumber >= numPages}
                    className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-40 cursor-pointer hover:bg-gray-100"
                  >
                    Next
                  </button>
                </div>

                {/* Interactive preview */}
                <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center rounded-xl bg-gray-100 p-4">
                  <SignaturePlaceCanvas
                    file={file}
                    pageNumber={pageNumber}
                    signature={signature}
                    placement={currentPlacement}
                    placing={placing}
                    onPlace={placeAt}
                    onRemove={removeCurrent}
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
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <PDFThumbnail file={file} className="w-14 h-auto block" />
                      {placements.has(n) && (
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

        {/* RIGHT: Signature settings */}
        <SidePanel disabled={isDisabled} overlayText="Please choose a file first">
          <h2 className="text-xl font-semibold mb-4">Signature</h2>

          {!signature ? (
            <>
              <SignatureDrawer onSave={handleDrawSave} />

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>

              <Button
                variant="gray"
                size="sm"
                className="w-full cursor-pointer"
                onClick={() => signatureInputRef.current?.click()}
              >
                Upload signature image
              </Button>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleSignatureUpload}
              />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-100">
                <img
                  src={signature}
                  alt="Signature"
                  className="w-28 h-auto bg-white rounded-lg border border-gray-200"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    variant="gray"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => signatureInputRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer text-red-600"
                    onClick={() => setSignature(null)}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={handleSignatureUpload}
              />
            </div>
          )}

          <div className="mt-4">
            <label className="text-sm text-gray-500">
              Signature size: {signWidth} pt
            </label>
            <input
              type="range"
              min={60}
              max={320}
              value={signWidth}
              onChange={(e) => setSignWidth(Number(e.target.value))}
              className="w-full mt-2 cursor-pointer"
              style={{ colorScheme: "light" }}
            />
          </div>

          <div className="mt-4">
            <Button
              variant={placing ? "primary" : "secondary"}
              size="md"
              className={`w-full cursor-pointer`}
              disabled={!signature}
              onClick={() => setPlacing((v) => !v)}
            >
              {placing ? "Click the page to place" : "Place on page"}
            </Button>
          </div>

          {currentPlacement && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 cursor-pointer text-red-600"
              onClick={removeCurrent}
            >
              Remove from this page
            </Button>
          )}

          <p className="mt-4 text-sm text-gray-600">
            {signedCount} of {numPages} page
            {signedCount === 1 ? "" : "s"} signed
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4">
            <Button
              variant="secondary"
              className="w-full cursor-pointer"
              loading={signing}
              disabled={!signature || signedCount === 0 || signing}
              onClick={handleSign}
            >
              Sign &amp; Download
            </Button>
          </div>
        </SidePanel>
      </div>
    </div>
  );
};

export default SignPdf;
