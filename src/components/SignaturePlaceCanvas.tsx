import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import type { SignaturePlacement } from "../features/pdf/signatureService";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface Props {
  file: File;
  pageNumber: number;
  signature: string | null;
  placement: SignaturePlacement | null;
  preview?: boolean;
  onPlace: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onResize: (x: number, y: number, width: number, height: number) => void;
  onRemove: () => void;
}

const TARGET_WIDTH = 680;
const MIN_SIZE = 20;

const SignaturePlaceCanvas = ({
  file,
  pageNumber,
  signature,
  placement,
  preview = false,
  onPlace,
  onMove,
  onResize,
  onRemove,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const dragRef = useRef<{
    startPdfX: number;
    startPdfY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeRef = useRef<{ anchorX: number; anchorY: number } | null>(null);
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (preview || !signature || !e.dataTransfer.types.includes("text/plain"))
      return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (preview || !signature) return;
    const dragged = e.dataTransfer.getData("text/plain");
    if (!dragged || dragged !== signature) return;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const [x, y] = viewport.convertToPdfPoint(px, py);
    onPlace(x, y);
  };

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!placement || !view) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      const rect = container.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      dragRef.current = {
        startPdfX: pdfX,
        startPdfY: pdfY,
        origX: placement.x,
        origY: placement.y,
      };
      setIsDragging(true);
    },
    [placement, view],
  );

  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !view) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      const newX = dragRef.current.origX + (pdfX - dragRef.current.startPdfX);
      const newY = dragRef.current.origY + (pdfY - dragRef.current.startPdfY);
      onMove(newX, newY);
    },
    [view, onMove],
  );

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      if (!placement || !view) return;
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeRef.current = {
        anchorX: placement.x,
        anchorY: placement.y + placement.height,
      };
      setIsResizing(true);
    },
    [placement, view],
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current || !view || !placement) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      const [pdfX, pdfY] = view.viewport.convertToPdfPoint(px, py);
      const { anchorX, anchorY } = resizeRef.current;
      const minPdf = MIN_SIZE / view.scale;
      const width = Math.max(minPdf, pdfX - anchorX);
      const height = Math.max(minPdf, anchorY - pdfY);
      onResize(anchorX, anchorY - height, width, height);
    },
    [view, placement, onResize],
  );

  const handleResizeEnd = useCallback(() => {
    resizeRef.current = null;
    setIsResizing(false);
  }, []);

  let overlay: { left: number; top: number; width: number; height: number } | null =
    null;
  if (placement && signature && view) {
    const [left, top] = view.viewport.convertToViewportPoint(
      placement.x,
      placement.y + placement.height,
    );
    const { sx, sy } = displayScale;
    overlay = {
      left: left * sx,
      top: top * sy,
      width: placement.width * view.scale * sx,
      height: placement.height * view.scale * sy,
    };
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl shadow-sm ${signature ? "cursor-copy" : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="block max-w-full h-auto rounded-xl"
        style={{ width: view?.width, height: view?.height }}
      />

      {overlay &&
        (preview ? (
          <div
            className="absolute pointer-events-none"
            style={{
              left: overlay.left,
              top: overlay.top,
              width: overlay.width,
              height: overlay.height,
            }}
          >
            <img
              src={signature!}
              alt="Signature"
              className="w-full h-full object-fill block"
            />
          </div>
        ) : (
          <div
            className="absolute border-2 border-dashed border-brand-500 bg-brand-500/10 overflow-visible group touch-none select-none"
            style={{
              left: overlay.left,
              top: overlay.top,
              width: overlay.width,
              height: overlay.height,
              cursor: isDragging ? "grabbing" : isResizing ? "nwse-resize" : "grab",
            }}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
          >
            <img
              src={signature!}
              alt="Signature"
              className="w-full h-full object-fill block pointer-events-none"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
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
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
            />
          </div>
        ))}

      {!preview && placement && signature && (
        <p className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/70 text-white text-xs pointer-events-none">
          Drag to move · resize the corner · click ✕ to remove
        </p>
      )}

      {!preview && !placement && signature && (
        <p className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/70 text-white text-xs pointer-events-none">
          Drag your signature here to place it
        </p>
      )}
    </div>
  );
};

export default SignaturePlaceCanvas;
