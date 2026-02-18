import { useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import type { LabelBox } from "../types";

export function useLabels() {
  const [labels, setLabels] = useState<LabelBox[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragState = useRef<{ id: string; ox: number; oy: number } | null>(null);

  const addLabel = useCallback((x: number, y: number) => {
    const lb: LabelBox = {
      id: uuid(),
      text: "Etiqueta",
      x,
      y,
    };
    setLabels((prev) => [...prev, lb]);
    setSelectedId(lb.id);
    return lb.id;
  }, []);

  // Place label at specific position (for drag & drop)
  const placeLabel = useCallback((x: number, y: number) => {
    const lb: LabelBox = {
      id: uuid(),
      text: "Texto",
      x: x - 40,
      y: y - 10,
    };
    setLabels((prev) => [...prev, lb]);
    setSelectedId(lb.id);
    return lb.id;
  }, []);

  const updateText = useCallback((id: string, text: string) => {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  }, []);

  const deleteLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const hitTest = useCallback(
    (px: number, py: number): string | null => {
      const W = 160, H = 40;
      for (let i = labels.length - 1; i >= 0; i--) {
        const l = labels[i];
        if (px >= l.x && px <= l.x + W && py >= l.y && py <= l.y + H) {
          return l.id;
        }
      }
      return null;
    },
    [labels]
  );

  const startDrag = useCallback(
    (px: number, py: number) => {
      const id = hitTest(px, py);
      if (id) {
        const lb = labels.find((l) => l.id === id)!;
        dragState.current = { id, ox: px - lb.x, oy: py - lb.y };
        setSelectedId(id);
        return true;
      }
      return false;
    },
    [labels, hitTest]
  );

  const moveDrag = useCallback((px: number, py: number) => {
    if (!dragState.current) return;
    const { id, ox, oy } = dragState.current;
    setLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, x: px - ox, y: py - oy } : l))
    );
  }, []);

  const endDrag = useCallback(() => {
    dragState.current = null;
  }, []);

  return {
    labels,
    selectedId,
    setSelectedId,
    addLabel,
    placeLabel,
    updateText,
    deleteLabel,
    startDrag,
    moveDrag,
    endDrag,
  };
}