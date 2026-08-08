import { useEffect, useRef, useState } from "react";
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
  placing: boolean;
  onPlace: (x: number, y: number) => void;
  onRemove: () => void;
}

const TARGET_WIDTH = 680;

const SignaturePlaceCanvas = ({
  file,
  pageNumber,
  signature,
  placement,
  placing,
  onPlace,
  onRemove,
}: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);
  const [view, setView] = useState<{
    viewport: pdfjsLib.PageViewport;
    scale: number;
    width: number;
    height: number;
  } | null>(null);

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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !signature) return;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const [x, y] = viewport.convertToPdfPoint(px, py);
    onPlace(x, y);
  };

  let overlay: { left: number; top: number; width: number } | null = null;
  if (placement && signature && view) {
    const [left, top] = view.viewport.convertToViewportPoint(
      placement.x,
      placement.y,
    );
    overlay = { left, top, width: placement.width * view.scale };
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className={`relative rounded-xl overflow-hidden shadow-sm ${
        placing ? "cursor-crosshair" : ""
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block max-w-full h-auto"
        style={{ width: view?.width, height: view?.height }}
      />

      {overlay && (
        <div
          className="absolute border-2 border-dashed border-brand-500 bg-brand-500/10 overflow-hidden group"
          style={{
            left: overlay.left,
            top: overlay.top,
            width: overlay.width,
            aspectRatio: `${placement!.width} / ${placement!.height}`,
          }}
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
            aria-label="Remove signature"
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center hover:bg-red-600 cursor-pointer transition"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}

      {placing && signature && (
        <p className="absolute top-2 left-2 px-2 py-1 rounded-md bg-gray-900/70 text-white text-xs pointer-events-none">
          Click anywhere on the page to place your signature
        </p>
      )}
    </div>
  );
};

export default SignaturePlaceCanvas;
