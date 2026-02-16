import { useState, useCallback, useRef } from "react";
import type { Shape, Tool, EraserStroke } from "../types";
import { v4 as uuidv4 } from "uuid";

const STROKE_COLOR = "#000000";
const STROKE_WIDTH = 2;
const ERASER_WIDTH = 18;

let shapeCounter = 0;
function nextName(type: string): string {
  shapeCounter++;
  const labels: Record<string, string> = {
    rect: "Rectángulo",
    circle: "Círculo",
    line: "Línea",
    free: "Trazo",
  };
  return `${labels[type] ?? type} ${shapeCounter}`;
}

export function useDrawing(tool: Tool, canvasW: number, canvasH: number) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  // Eraser: track which shape we're erasing and which stroke index
  const activeEraser = useRef<{ shapeId: string; strokeIndex: number } | null>(null);
  const historyPushedForEraser = useRef(false);

  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev, shapes]);
    setRedoStack([]);
  }, [shapes]);

  /* ── Hit test ── */
  const findShapeAtPoint = useCallback(
    (px: number, py: number): string | null => {
      const TOL = 14;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (!s.visible || s.locked) continue;

        if (s.type === "rect") {
          const minX = Math.min(s.x, s.x + s.width);
          const maxX = Math.max(s.x, s.x + s.width);
          const minY = Math.min(s.y, s.y + s.height);
          const maxY = Math.max(s.y, s.y + s.height);
          if (px >= minX - TOL && px <= maxX + TOL && py >= minY - TOL && py <= maxY + TOL)
            return s.id;
        }
        if (s.type === "circle") {
          const dist = Math.sqrt((px - s.x) ** 2 + (py - s.y) ** 2);
          if (dist <= s.radius + TOL) return s.id;
        }
        if (s.type === "line") {
          if (distToSeg(px, py, s.x1, s.y1, s.x2, s.y2) < TOL) return s.id;
        }
        if (s.type === "free") {
          const pts = s.points;
          for (let j = 0; j < pts.length - 2; j += 2) {
            if (distToSeg(px, py, pts[j], pts[j + 1], pts[j + 2], pts[j + 3]) < TOL)
              return s.id;
          }
        }
      }
      return null;
    },
    [shapes]
  );

  const getShapeOrigin = useCallback(
    (id: string): { x: number; y: number } | null => {
      const s = shapes.find((sh) => sh.id === id);
      if (!s) return null;
      if (s.type === "rect") return { x: s.x, y: s.y };
      if (s.type === "circle") return { x: s.x, y: s.y };
      if (s.type === "line") return { x: s.x1, y: s.y1 };
      if (s.type === "free") return { x: s.points[0] ?? 0, y: s.points[1] ?? 0 };
      return null;
    },
    [shapes]
  );

  /* ── MOUSE DOWN ── */
  const handleMouseDown = useCallback(
    (pointer: { x: number; y: number }) => {
      if (pointer.x < 0 || pointer.x > canvasW || pointer.y < 0 || pointer.y > canvasH) return;

      // ── Move ──
      if (tool === "move") {
        const hitId = findShapeAtPoint(pointer.x, pointer.y);
        setSelectedId(hitId);
        if (hitId) {
          const origin = getShapeOrigin(hitId);
          if (origin) {
            pushHistory();
            dragOffset.current = { dx: pointer.x - origin.x, dy: pointer.y - origin.y };
            setIsDrawing(true);
          }
        }
        return;
      }

      // ── Eraser ──
      if (tool === "eraser") {
        // We'll start erasing on mouseMove — just mark that we're active
        historyPushedForEraser.current = false;
        activeEraser.current = null;
        setIsDrawing(true);

        // Try to start erasing immediately if on a shape
        const hitId = findShapeAtPoint(pointer.x, pointer.y);
        if (hitId) {
          pushHistory();
          historyPushedForEraser.current = true;
          const newStroke: EraserStroke = { points: [pointer.x, pointer.y], width: ERASER_WIDTH };
          let strokeIdx = 0;
          setShapes((prev) =>
            prev.map((s) => {
              if (s.id !== hitId) return s;
              strokeIdx = s.eraserStrokes.length;
              return { ...s, eraserStrokes: [...s.eraserStrokes, newStroke] };
            })
          );
          activeEraser.current = { shapeId: hitId, strokeIndex: strokeIdx };
        }
        return;
      }

      // ── Drawing tools ──
      pushHistory();
      const base = {
        id: uuidv4(),
        visible: true,
        locked: false,
        eraserStrokes: [] as EraserStroke[],
      };

      if (tool === "rect") {
        const shape: Shape = {
          ...base,
          name: nextName("rect"),
          type: "rect",
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
        };
        setShapes((prev) => [...prev, shape]);
        setSelectedId(shape.id);
        setIsDrawing(true);
      }

      if (tool === "circle") {
        const shape: Shape = {
          ...base,
          name: nextName("circle"),
          type: "circle",
          x: pointer.x,
          y: pointer.y,
          radius: 0,
        };
        setShapes((prev) => [...prev, shape]);
        setSelectedId(shape.id);
        setIsDrawing(true);
      }

      if (tool === "line") {
        const shape: Shape = {
          ...base,
          name: nextName("line"),
          type: "line",
          points: [pointer.x, pointer.y, pointer.x, pointer.y],
          x1: pointer.x,
          y1: pointer.y,
          x2: pointer.x,
          y2: pointer.y,
        };
        setShapes((prev) => [...prev, shape]);
        setSelectedId(shape.id);
        setIsDrawing(true);
      }

      if (tool === "free") {
        const shape: Shape = {
          ...base,
          name: nextName("free"),
          type: "free",
          points: [pointer.x, pointer.y],
        };
        setShapes((prev) => [...prev, shape]);
        setSelectedId(shape.id);
        setIsDrawing(true);
      }
    },
    [tool, shapes, canvasW, canvasH, findShapeAtPoint, getShapeOrigin, pushHistory]
  );

  /* ── MOUSE MOVE ── */
  const handleMouseMove = useCallback(
    (pointer: { x: number; y: number }) => {
      if (!isDrawing) return;

      // ── Move ──
      if (tool === "move" && selectedId && dragOffset.current) {
        const { dx, dy } = dragOffset.current;
        setShapes((prev) =>
          prev.map((s) => {
            if (s.id !== selectedId) return s;
            const nx = pointer.x - dx;
            const ny = pointer.y - dy;

            if (s.type === "rect") return { ...s, x: nx, y: ny };
            if (s.type === "circle") return { ...s, x: nx, y: ny };
            if (s.type === "line") {
              const ddx = nx - s.x1;
              const ddy = ny - s.y1;
              return {
                ...s,
                x1: s.x1 + ddx, y1: s.y1 + ddy,
                x2: s.x2 + ddx, y2: s.y2 + ddy,
                points: [s.x1 + ddx, s.y1 + ddy, s.x2 + ddx, s.y2 + ddy],
              };
            }
            if (s.type === "free") {
              const ox = s.points[0] ?? 0;
              const oy = s.points[1] ?? 0;
              const ddx = nx - ox;
              const ddy = ny - oy;
              return {
                ...s,
                points: s.points.map((v, idx) => (idx % 2 === 0 ? v + ddx : v + ddy)),
                eraserStrokes: s.eraserStrokes.map((es) => ({
                  ...es,
                  points: es.points.map((v, idx) => (idx % 2 === 0 ? v + ddx : v + ddy)),
                })),
              };
            }
            return s;
          })
        );
        return;
      }

      // ── Eraser ──
      if (tool === "eraser") {
        // Check what shape is under the cursor right now
        const hitId = findShapeAtPoint(pointer.x, pointer.y);

        if (activeEraser.current && activeEraser.current.shapeId === hitId) {
          // Continue erasing on same shape
          const { shapeId, strokeIndex } = activeEraser.current;
          setShapes((prev) =>
            prev.map((s) => {
              if (s.id !== shapeId) return s;
              const strokes = [...s.eraserStrokes];
              if (strokes[strokeIndex]) {
                strokes[strokeIndex] = {
                  ...strokes[strokeIndex],
                  points: [...strokes[strokeIndex].points, pointer.x, pointer.y],
                };
              }
              return { ...s, eraserStrokes: strokes };
            })
          );
        } else if (hitId) {
          // Moved onto a different shape — start new eraser stroke on that shape
          if (!historyPushedForEraser.current) {
            pushHistory();
            historyPushedForEraser.current = true;
          }
          const newStroke: EraserStroke = { points: [pointer.x, pointer.y], width: ERASER_WIDTH };
          let strokeIdx = 0;
          setShapes((prev) =>
            prev.map((s) => {
              if (s.id !== hitId) return s;
              strokeIdx = s.eraserStrokes.length;
              return { ...s, eraserStrokes: [...s.eraserStrokes, newStroke] };
            })
          );
          activeEraser.current = { shapeId: hitId, strokeIndex: strokeIdx };
        } else {
          // Not on any shape
          activeEraser.current = null;
        }
        return;
      }

      // ── Drawing ──
      setShapes((prev) =>
        prev.map((shape, index) => {
          if (index !== prev.length - 1) return shape;
          if (shape.type === "rect") {
            return { ...shape, width: pointer.x - shape.x, height: pointer.y - shape.y };
          }
          if (shape.type === "circle") {
            const dx = pointer.x - shape.x;
            const dy = pointer.y - shape.y;
            return { ...shape, radius: Math.sqrt(dx * dx + dy * dy) };
          }
          if (shape.type === "line") {
            return {
              ...shape,
              x2: pointer.x, y2: pointer.y,
              points: [shape.x1, shape.y1, pointer.x, pointer.y],
            };
          }
          if (shape.type === "free") {
            return { ...shape, points: [...shape.points, pointer.x, pointer.y] };
          }
          return shape;
        })
      );
    },
    [isDrawing, tool, selectedId, findShapeAtPoint, pushHistory]
  );

  /* ── MOUSE UP ── */
  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    dragOffset.current = null;
    activeEraser.current = null;
    historyPushedForEraser.current = false;
  }, []);

  /* ── Undo / Redo ── */
  const undo = useCallback(() => {
    if (history.length === 0) return;
    setRedoStack((prev) => [...prev, shapes]);
    setShapes(history[history.length - 1]);
    setHistory((prev) => prev.slice(0, -1));
  }, [history, shapes]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    setHistory((prev) => [...prev, shapes]);
    setShapes(redoStack[redoStack.length - 1]);
    setRedoStack((prev) => prev.slice(0, -1));
  }, [redoStack, shapes]);

  /* ── Layer operations ── */
  const deleteShape = useCallback(
    (id: string) => {
      pushHistory();
      setShapes((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [pushHistory, selectedId]
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      pushHistory();
      setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
    },
    [pushHistory]
  );

  const toggleLock = useCallback(
    (id: string) => {
      pushHistory();
      setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)));
    },
    [pushHistory]
  );

  const moveLayerUp = useCallback(
    (id: string) => {
      pushHistory();
      setShapes((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx < 0 || idx >= prev.length - 1) return prev;
        const arr = [...prev];
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        return arr;
      });
    },
    [pushHistory]
  );

  const moveLayerDown = useCallback(
    (id: string) => {
      pushHistory();
      setShapes((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx <= 0) return prev;
        const arr = [...prev];
        [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
        return arr;
      });
    },
    [pushHistory]
  );

  const renameShape = useCallback((id: string, name: string) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, []);

  const clearAll = useCallback(() => {
    if (shapes.length === 0) return;
    pushHistory();
    setShapes([]);
    setSelectedId(null);
  }, [shapes, pushHistory]);

  return {
    shapes,
    selectedId,
    setSelectedId,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    undo,
    redo,
    clearAll,
    deleteShape,
    toggleVisibility,
    toggleLock,
    moveLayerUp,
    moveLayerDown,
    renameShape,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    STROKE_COLOR,
    STROKE_WIDTH,
  };
}

function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let t = lenSq !== 0 ? dot / lenSq : -1;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const xx = x1 + t * C, yy = y1 + t * D;
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
}