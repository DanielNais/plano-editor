import { useState, useCallback } from "react";
import { v4 as uuid } from "uuid";
import type { OutlinePoint, OutlineLine } from "../types";

const GRID = 40;

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

export function useOutline() {
  const [points, setPoints] = useState<OutlinePoint[]>([]);
  const [lines, setLines] = useState<OutlineLine[]>([]);
  const [preview, setPreview] = useState<OutlinePoint | null>(null);
  const [closed, setClosed] = useState(false);

  /** Called on canvas click during outline phase */
  const addPoint = useCallback(
    (rawX: number, rawY: number) => {
      if (closed) return;
      const x = snap(rawX);
      const y = snap(rawY);

      setPoints((prev) => {
        if (prev.length === 0) {
          return [{ x, y }];
        }

        // Check if user clicked near the first point to close the shape
        const first = prev[0];
        const dist = Math.sqrt((x - first.x) ** 2 + (y - first.y) ** 2);

        if (prev.length >= 3 && dist < GRID) {
          // Close the polygon
          const last = prev[prev.length - 1];
          setLines((ls) => [
            ...ls,
            { id: uuid(), x1: last.x, y1: last.y, x2: first.x, y2: first.y },
          ]);
          setClosed(true);
          return prev;
        }

        const last = prev[prev.length - 1];
        setLines((ls) => [
          ...ls,
          { id: uuid(), x1: last.x, y1: last.y, x2: x, y2: y },
        ]);
        return [...prev, { x, y }];
      });
    },
    [closed]
  );

  const updatePreview = useCallback(
    (rawX: number, rawY: number) => {
      if (closed) { setPreview(null); return; }
      setPreview({ x: snap(rawX), y: snap(rawY) });
    },
    [closed]
  );

  const undoLastPoint = useCallback(() => {
    if (closed) return;
    setPoints((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      setLines((ls) => ls.slice(0, -1));
      return next;
    });
  }, [closed]);

  const reset = useCallback(() => {
    setPoints([]);
    setLines([]);
    setPreview(null);
    setClosed(false);
  }, []);

  return {
    points,
    lines,
    preview,
    closed,
    addPoint,
    updatePreview,
    undoLastPoint,
    reset,
  };
}
