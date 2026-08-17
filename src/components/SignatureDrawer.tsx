import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";

interface Props {
  onSave: (dataUrl: string) => void;
}

const WIDTH = 360;
const HEIGHT = 180;
const STROKE_WIDTH = 2.5;

type Point = [number, number];
type Stroke = Point[];

const SignatureDrawer = ({ onSave }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke>([]);
  const [hasStroke, setHasStroke] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return [
      Math.max(0, Math.min(canvas.width, x)),
      Math.max(0, Math.min(canvas.height, y)),
    ];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drawingRef.current = true;
    currentRef.current = [getPos(e)];
    (e.target as Element).setPointerCapture?.(e.pointerId);
    redrawCurrent();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const stroke = currentRef.current;
    const [x, y] = getPos(e);
    const last = stroke[stroke.length - 1];
    if (last && Math.abs(last[0] - x) < 0.5 && Math.abs(last[1] - y) < 0.5)
      return;
    stroke.push([x, y]);
    redrawCurrent();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentRef.current.length > 1) {
      strokesRef.current.push(currentRef.current);
    }
    currentRef.current = [];
    setHasStroke(strokesRef.current.length > 0);
    redraw();
  };

  // Keep painting the in-progress stroke without triggering a full redraw.
  const redrawCurrent = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const stroke = currentRef.current;
    if (stroke.length < 2) return;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(stroke[0][0], stroke[0][1]);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i][0], stroke[i][1]);
    }
    ctx.stroke();
  };

  const clear = () => {
    strokesRef.current = [];
    currentRef.current = [];
    setHasStroke(false);
    redraw();
  };

  const undo = () => {
    strokesRef.current.pop();
    setHasStroke(strokesRef.current.length > 0);
    redraw();
  };

  const save = () => {
    if (!hasStroke) return;
    onSave(canvasRef.current!.toDataURL("image/png"));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="w-full h-auto block bg-white touch-none cursor-crosshair"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="gray"
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={undo}
          disabled={!hasStroke}
        >
          Undo
        </Button>
        <Button
          variant="gray"
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={clear}
          disabled={!hasStroke}
        >
          Clear
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1 cursor-pointer"
          onClick={save}
          disabled={!hasStroke}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default SignatureDrawer;
