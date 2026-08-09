import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  SIGNATURE_DRAG_TYPE,
  type SignaturePlacement,
} from "../features/pdf/signatureService";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface Props {
  file: File;
  pageNumber: number;
  signatures: { id: string; dataUrl: string }[];
  placements: SignaturePlacement[];
  activeSignatureId: string | null;
  preview?: boolean;
  onSelect: (signatureId: string) => void;
  onPlace: (signatureId: string, x: number, y: number) => void;
  onMove: (signatureId: string, x: number, y: number) => void;
  onResize: (
    signatureId: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  onRemove: (signatureId: string) => void;
}

const TARGET_WIDTH = 680;
const MIN_SIZE = 20;

const SignaturePlaceCanvas = ({
  file,
  pageNumber,
  signatures,
  placements,
  activeSignatureId,
  preview = false,
  onSelect,
  onPlace,
  onMove,
  onResize,
  onRemove,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const dragRef = useRef<{
    signatureId: string;
    startPdfX: number;
    startPdfY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{
    signatureId: string;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [view, setView] = useState<{
    viewport: pdfjsLib.PageViewport;
    scale: number;
    width: number;
    height: number;
  } | null>(null);
  const [displayScale, setDisplayScale] = useState({ sx: 1, sy: 1 });

  useEffect(() => {
    let cancelled = false;
    let task: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const render = async () => {
      try {
        const data = await file.arrayBuffer();
        if (cancelled) return;

        task = pdfjsLib.getDocument({ data });
        const pdf = await task.promise;
        if (cancelled) {
          task?.destroy().catch(() => {});
          return;
        }

        const page = await pdf.getPage(pageNumber);
        if (cancelled) {
          task?.destroy().catch(() => {});
          return;
        }

        const base = page.getViewport({ scale: 1 });
        const scale = TARGET_WIDTH / base.width;
        const viewport = page.getViewport({ scale });
        viewportRef.current = viewport;

        const canvas = canvasRef.current;
        if (!canvas) {
          task?.destroy().catch(() => {});
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setView({
          viewport,
          scale,
          width: viewport.width,
          height: viewport.height,
        });

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          task?.destroy().catch(() => {});
          return;
        }

        const renderTask = page.render({ canvasContext: ctx, canvas, viewport });
        await renderTask.promise;

        task?.destroy().catch(() => {});
      } catch {
        /* ignore render errors */
      }
    };

    render();

    return () => {
      cancelled = true;
      task?.destroy().catch(() => {});
    };
  }, [file, pageNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      setDisplayScale({
        sx: rect.width ? rect.width / canvas.width : 1,
        sy: rect.height ? rect.height / canvas.height : 1,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [view?.width, view?.height]);

  const getDragSignatureId = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      return e.dataTransfer.getData(SIGNATURE_DRAG_TYPE);
    } catch {
      return "";
    }
  };

  const hasSignatureDrag = (e: React.DragEvent<HTMLDivElement>) =>
    e.dataTransfer.types.includes(SIGNATURE_DRAG_TYPE);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (preview || signatures.length === 0 || !hasSignatureDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const signatureId = getDragSignatureId(e);
    if (preview || !signatureId) return;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const [x, y] = viewport.convertToPdfPoint(px, py);
    onPlace(signatureId, x, y);
  };

  const handleDragStart = useCallback(
    (e: React.PointerEvent, signatureId: string) => {
      if (!view) return;
      const p = placements.find((x) => x.signatureId === signatureId);
      const canvas = canvasRef.current;
      if (!p || !canvas) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const rect = containerRef.current!.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      dragRef.current = {
        signatureId,
        startPdfX: pdfX,
        startPdfY: pdfY,
        origX: p.x,
        origY: p.y,
      };
      onSelect(signatureId);
      setIsDragging(true);
    },
    [view, placements, onSelect],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !view) return;
      const p = placements.find(
        (x) => x.signatureId === dragRef.current!.signatureId,
      );
      const canvas = canvasRef.current;
      if (!p || !canvas) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      const newX = dragRef.current.origX + (pdfX - dragRef.current.startPdfX);
      const newY = dragRef.current.origY + (pdfY - dragRef.current.startPdfY);
      onMove(p.signatureId, newX, newY);
    },
    [view, placements, onMove],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent, signatureId: string) => {
      if (!view) return;
      const p = placements.find((x) => x.signatureId === signatureId);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = {
        signatureId,
        anchorX: p.x,
        anchorY: p.y + p.height,
      };
      onSelect(signatureId);
      setIsResizing(true);
    },
    [view, placements, onSelect],
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current || !view) return;
      const p = placements.find(
        (x) => x.signatureId === resizeRef.current!.signatureId,
      );
      const canvas = canvasRef.current;
      if (!p || !canvas) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      const { anchorX, anchorY } = resizeRef.current;
      const minPdf = MIN_SIZE / view.scale;
      const width = Math.max(minPdf, pdfX - anchorX);
      const height = Math.max(minPdf, anchorY - pdfY);
      onResize(
        resizeRef.current.signatureId,
        anchorX,
        anchorY - height,
        width,
        height,
      );
    },
    [view, placements, onResize],
  );

  const handleResizeEnd = useCallback(() => {
    resizeRef.current = null;
    setIsResizing(false);
  }, []);

  const overlays: {
    signatureId: string;
    dataUrl: string;
    left: number;
    top: number;
    width: number;
    height: number;
    active: boolean;
  }[] = [];
  if (view) {
    for (const p of placements) {
      const sig = signatures.find((s) => s.id === p.signatureId);
      if (!sig) continue;
      const [left, top] = view.viewport.convertToViewportPoint(
        p.x,
        p.y + p.height,
      );
      const { sx, sy } = displayScale;
      overlays.push({
        signatureId: p.signatureId,
        dataUrl: sig.dataUrl,
        left: left * sx,
        top: top * sy,
        width: p.width * view.scale * sx,
        height: p.height * view.scale * sy,
        active: p.signatureId === activeSignatureId,
      });
    }
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl shadow-sm ${
        signatures.length > 0 ? "cursor-copy" : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block max-w-full h-auto rounded-xl"
        style={{ width: view?.width, height: view?.height }}
      />

      {overlays.map((o) =>
        preview ? (
          <div
            key={o.signatureId}
            className="absolute pointer-events-none"
            style={{
              left: o.left,
              top: o.top,
              width: o.width,
              height: o.height,
            }}
          >
            <img
              src={o.dataUrl}
              alt="Signature"
              className="w-full h-full object-fill block"
            />
          </div>
        ) : (
          <div
            key={o.signatureId}
            className={`absolute overflow-visible group touch-none select-none ${
              o.active
                ? "border-2 border-dashed border-brand-500 bg-brand-500/10"
                : "border border-brand-400/70 bg-brand-500/5 hover:bg-brand-500/10"
            }`}
            style={{
              left: o.left,
              top: o.top,
              width: o.width,
              height: o.height,
              zIndex: o.active ? 10 : 5,
              cursor: isDragging ? "grabbing" : isResizing ? "nwse-resize" : "grab",
            }}
            onPointerDown={(e) => handleDragStart(e, o.signatureId)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <img
              src={o.dataUrl}
              alt="Signature"
              className="w-full h-full object-fill block pointer-events-none"
            />
            {o.active && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(o.signatureId);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Remove signature"
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 cursor-pointer transition shadow-md"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Resize signature"
                  className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-brand-600 rounded-sm cursor-nwse-resize touch-none border border-white"
                  onPointerDown={(e) => handleResizeStart(e, o.signatureId)}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                />
              </>
            )}
          </div>
        ),
      )}

      {!preview && placements.length > 0 && (
        <p className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/70 text-white text-xs pointer-events-none">
          Drag to move · resize the corner · click ✕ to remove
        </p>
      )}

      {!preview && placements.length === 0 && signatures.length > 0 && (
        <p className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/70 text-white text-xs pointer-events-none">
          Drag your signature here to place it
        </p>
      )}
    </div>
  );
};

export default SignaturePlaceCanvas;