import { useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import type { PlacedObject, ObjectKind } from "../types";

const MIN_SIZE = 20;
export const HANDLE = 12;

const DEFAULTS: Record<ObjectKind, { w: number; h: number; label: string }> = {
  rect:   { w: 100, h: 80,  label: "Rectángulo" },
  circle: { w: 80,  h: 80,  label: "Círculo"    },
  line:   { w: 120, h: 4,   label: "Línea"       },
  door:   { w: 80,  h: 80,  label: "Puerta"      },
  window: { w: 80,  h: 24,  label: "Ventana"     },
};

type InteractMode = "move" | "resize";
type DragState = {
  id:     string;
  mode:   InteractMode;
  // move
  ox: number; oy: number;
  // resize — stored in LOCAL (pre-rotation) space
  origW:  number; origH:  number;
  // world position of pointer at drag start
  startX: number; startY: number;
  // rotation angle at drag start (radians) for resize transform
  cosA: number; sinA: number;
};

/** Rotate world-delta into the object's local space */
function worldToLocal(dx: number, dy: number, cosA: number, sinA: number) {
  return {
    lx:  dx * cosA + dy * sinA,   // component along object's local X axis
    ly: -dx * sinA + dy * cosA,   // component along object's local Y axis
  };
}

export function useObjects() {
  const [objects, setObjects]       = useState<PlacedObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);

  // ── Add ──────────────────────────────────────────────────────────────────
  const addObject = useCallback((kind: ObjectKind, cW: number, cH: number) => {
    const d = DEFAULTS[kind];
    const obj: PlacedObject = {
      id: uuid(), kind, label: d.label,
      x: Math.round((cW / 2 - d.w / 2) / 10) * 10,
      y: Math.round((cH / 2 - d.h / 2) / 10) * 10,
      width: d.w, height: d.h,
      rotation: 0,
    };
    setObjects(prev => [...prev, obj]);
    setSelectedId(obj.id);
  }, []);

  // Place object at specific position (for drag & drop)
  const placeObject = useCallback((kind: ObjectKind, x: number, y: number) => {
    const d = DEFAULTS[kind];
    const obj: PlacedObject = {
      id: uuid(), kind, label: d.label,
      x: Math.round((x - d.w / 2) / 10) * 10,
      y: Math.round((y - d.h / 2) / 10) * 10,
      width: d.w, height: d.h,
      rotation: 0,
    };
    setObjects(prev => [...prev, obj]);
    setSelectedId(obj.id);
  }, []);

  // ── Fix / Delete ──────────────────────────────────────────────────────────

  const deleteObject = useCallback((id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  // ── Set rotation directly (called by slider) ──────────────────────────────
  const setRotation = useCallback((id: string, deg: number) => {
    setObjects(prev => prev.map(o => o.id === id ? { ...o, rotation: deg } : o));
  }, []);

  // ── Hit test in rotated space ─────────────────────────────────────────────
  // We transform the pointer into the object's local frame (pivot = centre).
  const hitTest = useCallback((px: number, py: number): { id: string; mode: InteractMode } | null => {
    for (let i = objects.length - 1; i >= 0; i--) {
      const o = objects[i];

      const cx = o.x + o.width  / 2;
      const cy = o.y + o.height / 2;
      const rad = (o.rotation * Math.PI) / 180;
      const cosA = Math.cos(-rad);
      const sinA = Math.sin(-rad);

      // Pointer relative to centre, rotated into local frame
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * cosA - dy * sinA;
      const ly = dx * sinA + dy * cosA;

      // Local coordinates relative to top-left corner
      const localX = lx + o.width  / 2;
      const localY = ly + o.height / 2;

      const inHandle =
        localX >= o.width  - HANDLE && localX <= o.width  + HANDLE &&
        localY >= o.height - HANDLE && localY <= o.height + HANDLE;

      const inBounds =
        localX >= 0 && localX <= o.width &&
        localY >= 0 && localY <= o.height;

      const inLine = o.kind === "line" &&
        localX >= -8 && localX <= o.width + 8 &&
        Math.abs(localY - o.height / 2) <= 8;

      if (inHandle)           return { id: o.id, mode: "resize" };
      if (inBounds || inLine) return { id: o.id, mode: "move"   };
    }
    return null;
  }, [objects]);

  // ── Drag start ────────────────────────────────────────────────────────────
  const startDrag = useCallback((px: number, py: number) => {
    const hit = hitTest(px, py);
    if (!hit) { setSelectedId(null); return; }
    const obj = objects.find(o => o.id === hit.id)!;
    setSelectedId(hit.id);
    const rad  = (obj.rotation * Math.PI) / 180;
    drag.current = {
      id: hit.id, mode: hit.mode,
      ox: px - obj.x, oy: py - obj.y,
      origW: obj.width, origH: obj.height,
      startX: px, startY: py,
      cosA: Math.cos(rad), sinA: Math.sin(rad),
    };
  }, [objects, hitTest]);

  // ── Drag move ─────────────────────────────────────────────────────────────
  const moveDrag = useCallback((px: number, py: number) => {
    if (!drag.current) return;
    const { id, mode, ox, oy, origW, origH, startX, startY, cosA, sinA } = drag.current;

    setObjects(prev => prev.map(o => {
      if (o.id !== id) return o;

      if (mode === "move") {
        return { ...o, x: px - ox, y: py - oy };
      }

      // Resize: project world-space delta onto object's local axes
      const worldDx = px - startX;
      const worldDy = py - startY;
      const { lx, ly } = worldToLocal(worldDx, worldDy, cosA, sinA);

      return {
        ...o,
        width:  Math.max(MIN_SIZE, origW + lx),
        height: Math.max(MIN_SIZE, origH + ly),
      };
    }));
  }, []);

  const endDrag = useCallback(() => { drag.current = null; }, []);

  // ── Cursor hint: is pointer over resize handle? ───────────────────────────
  const isOnHandle = useCallback((px: number, py: number): boolean => {
    const o = objects.find(obj => obj.id === selectedId);
    if (!o) return false;

    const cx  = o.x + o.width  / 2;
    const cy  = o.y + o.height / 2;
    const rad = (o.rotation * Math.PI) / 180;
    const cosA = Math.cos(-rad), sinA = Math.sin(-rad);
    const dx = px - cx, dy = py - cy;
    const lx = dx * cosA - dy * sinA + o.width  / 2;
    const ly = dx * sinA + dy * cosA + o.height / 2;

    return lx >= o.width - HANDLE && lx <= o.width + HANDLE &&
           ly >= o.height - HANDLE && ly <= o.height + HANDLE;
  }, [objects, selectedId]);

  return {
    objects, selectedId, setSelectedId,
    addObject, placeObject, deleteObject, setRotation,
    startDrag, moveDrag, endDrag, isOnHandle, hitTest,
  };
}