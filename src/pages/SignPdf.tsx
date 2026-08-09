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
  removeWhitePreview,
  SIGNATURE_DRAG_TYPE,
  type PdfSignature,
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
  const [signatures, setSignatures] = useState<PdfSignature[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(
    null,
  );
  const [signWidth, setSignWidth] = useState(150);
  const [opacity, setOpacity] = useState(100);
  const [placements, setPlacements] = useState<
    Map<number, Map<string, SignaturePlacement>>
  >(new Map());
  const [signing, setSigning] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const recompute = async () => {
      const next = new Map<string, string>();
      for (const sig of signatures) {
        if (opacity >= 100) {
          next.set(sig.id, sig.dataUrl);
        } else {
          try {
            next.set(
              sig.id,
              await removeWhitePreview(sig.dataUrl, 1 - opacity / 100),
            );
          } catch {
            next.set(sig.id, sig.dataUrl);
          }
        }
      }
      if (!cancelled) setPreviewUrls(next);
    };
    recompute();
    return () => {
      cancelled = true;
    };
  }, [signatures, opacity]);

  const handleUpload = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setFile(f);
    setPageNumber(1);
    setPlacements(new Map());
    try {
      setNumPages(await loadPageCount(f));
    } catch {
      setError("Could not read this PDF.");
      setNumPages(0);
    }
  };

  const addSignature = useCallback(async (dataUrl: string) => {
    try {
      const ratio = await getImageRatio(dataUrl);
      const id = crypto.randomUUID();
      setSignatures((prev) => [...prev, { id, dataUrl, ratio }]);
      setActiveSignatureId(id);
      setShowDrawer(false);
    } catch {
      setError("Could not load that signature image.");
    }
  }, []);

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
        await addSignature(await toPngDataUrl(dataUrl));
      } catch {
        setError("Could not load that signature image.");
      }
    };
    reader.readAsDataURL(f);
  };

  const removeSignature = (signatureId: string) => {
    setSignatures((prev) => prev.filter((s) => s.id !== signatureId));
    setPlacements((prev) => {
      const next = new Map<number, Map<string, SignaturePlacement>>();
      for (const [page, pageMap] of prev) {
        const pm = new Map(pageMap);
        pm.delete(signatureId);
        if (pm.size > 0) next.set(page, pm);
      }
      return next;
    });
    setActiveSignatureId((prev) => (prev === signatureId ? null : prev));
  };

  const placeAt = (signatureId: string, x: number, y: number) => {
    const sig = signatures.find((s) => s.id === signatureId);
    if (!sig) return;
    const w = signWidth;
    const h = signWidth / sig.ratio;
    setPlacements((prev) => {
      const next = new Map(prev);
      const pageMap = new Map(next.get(pageNumber) ?? new Map());
      pageMap.set(signatureId, {
        signatureId,
        x: x - w / 2,
        y: y - h / 2,
        width: w,
        height: h,
      });
      next.set(pageNumber, pageMap);
      return next;
    });
    setActiveSignatureId(signatureId);
  };

  const moveAt = (signatureId: string, x: number, y: number) => {
    setPlacements((prev) => {
      const pageMap = new Map(prev.get(pageNumber) ?? new Map());
      const p = pageMap.get(signatureId);
      if (!p) return prev;
      pageMap.set(signatureId, { ...p, x, y });
      const next = new Map(prev);
      next.set(pageNumber, pageMap);
      return next;
    });
  };

  const resizeAt = (
    signatureId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    setPlacements((prev) => {
      const pageMap = new Map(prev.get(pageNumber) ?? new Map());
      if (!pageMap.has(signatureId)) return prev;
      pageMap.set(signatureId, { x, y, width, height });
      const next = new Map(prev);
      next.set(pageNumber, pageMap);
      return next;
    });
  };

  const removeCurrentPlacement = (signatureId: string) => {
    setPlacements((prev) => {
      const pageMap = new Map(prev.get(pageNumber) ?? new Map());
      if (!pageMap.delete(signatureId)) return prev;
      const next = new Map(prev);
      if (pageMap.size === 0) {
        next.delete(pageNumber);
      } else {
        next.set(pageNumber, pageMap);
      }
      return next;
    });
  };

  const handleSign = async () => {
    if (!file || signatures.length === 0) return;
    setError(null);
    setSigning(true);
    try {
      await signPdf(file, signatures, placements, opacity / 100);
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
  const drawerOpen = signatures.length === 0 || showDrawer;
  const pagePlacements = placements.get(pageNumber) ?? new Map();
  const pagePlacementList = Array.from(pagePlacements.values());
  const currentPlacement = activeSignatureId
    ? pagePlacements.get(activeSignatureId) ?? null
    : null;

  let signedCount = 0;
  let totalPlacements = 0;
  placements.forEach((pm) => {
    if (pm.size > 0) signedCount++;
    totalPlacements += pm.size;
  });

  const pagesFor = (signatureId: string) => {
    const pages: number[] = [];
    for (const [page, pm] of placements) {
      if (pm.has(signatureId)) pages.push(page);
    }
    return pages;
  };

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
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
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
                  <button
                    type="button"
                    onClick={() => setPreviewMode((v) => !v)}
                    className={`px-3 py-1 rounded-lg border text-sm cursor-pointer transition ${
                      previewMode
                        ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-700"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {previewMode ? "Exit preview" : "Preview result"}
                  </button>
                </div>

                {/* Interactive preview */}
                <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center rounded-xl bg-gray-100 p-4">
                  <SignaturePlaceCanvas
                    file={file}
                    pageNumber={pageNumber}
                    signatures={signatures.map((s) => ({
                      id: s.id,
                      dataUrl: previewUrls.get(s.id) ?? s.dataUrl,
                    }))}
                    placements={pagePlacementList}
                    activeSignatureId={activeSignatureId}
                    preview={previewMode}
                    onSelect={setActiveSignatureId}
                    onPlace={placeAt}
                    onMove={moveAt}
                    onResize={resizeAt}
                    onRemove={removeCurrentPlacement}
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
                      {placements.get(n)?.size ? (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border border-white" />
                      ) : null}
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

          {drawerOpen && (
            <div className="flex flex-col">
              <SignatureDrawer onSave={addSignature} />

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

              {signatures.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 cursor-pointer"
                  onClick={() => setShowDrawer(false)}
                >
                  Back to signatures
                </Button>
              )}
            </div>
          )}

          {signatures.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {signatures.map((sig) => {
                const pages = pagesFor(sig.id);
                return (
                  <div
                    key={sig.id}
                    onClick={() => setActiveSignatureId(sig.id)}
                    className={`p-3 rounded-xl bg-white border transition cursor-pointer ${
                      sig.id === activeSignatureId
                        ? "border-brand-600 ring-1 ring-brand-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      draggable
                      onDragStart={(e) => {
                        if (previewMode) {
                          e.preventDefault();
                          showToast(
                            "Exit preview mode first to drag the signature onto the page",
                          );
                          return;
                        }
                        e.dataTransfer.setData(SIGNATURE_DRAG_TYPE, sig.id);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      title="Drag the signature onto the page"
                      className="flex items-center justify-center p-3 rounded-lg border-2 border-dashed border-brand-600 bg-brand-500/5 cursor-grab active:cursor-grabbing select-none touch-none hover:bg-brand-500/10 transition"
                    >
                      <img
                        src={previewUrls.get(sig.id) ?? sig.dataUrl}
                        alt="Signature"
                        draggable={false}
                        className="w-28 h-auto bg-white rounded border border-gray-200 pointer-events-none"
                      />
                    </div>
                    <p className="mt-2 text-center text-xs font-medium text-brand-700 pointer-events-none">
                      Drag the signature onto the page
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {pages.length} page{pages.length === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSignature(sig.id);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!drawerOpen && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={() => setShowDrawer(true)}
              >
                Draw new
              </Button>
              <Button
                variant="gray"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={() => signatureInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          )}

          <input
            ref={signatureInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleSignatureUpload}
          />

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
            <label className="text-sm text-gray-500">
              Transaparent (remove white background): {opacity}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full mt-2 cursor-pointer"
              style={{ colorScheme: "light" }}
            />
          </div>

          {currentPlacement && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 cursor-pointer text-red-600"
              onClick={() => removeCurrentPlacement(activeSignatureId!)}
            >
              Remove from this page
            </Button>
          )}

          <p className="mt-4 text-sm text-gray-600">
            {signedCount} of {numPages} page
            {signedCount === 1 ? "" : "s"} signed · {totalPlacements} signature
            {totalPlacements === 1 ? "" : "s"} placed
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
              disabled={
                signatures.length === 0 || signedCount === 0 || signing
              }
              onClick={handleSign}
            >
              Sign &amp; Download
            </Button>
          </div>
        </SidePanel>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-900/90 text-white text-sm shadow-lg pointer-events-none whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
};

export default SignPdf;