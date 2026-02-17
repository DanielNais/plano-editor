import { useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Line, Group, Text } from "react-konva";
import type { Phase, LabelBox } from "./draw/types";
import { useOutline, snap } from "./draw/hooks/useOutline";
import { useObjects } from "./draw/hooks/useObjects";
import { useLabels } from "./draw/hooks/useLabels";
import { ObjectSymbol } from "./draw/components/ObjectSymbol";
import LeftSidebar from "./draw/components/LeftSidebar";
import "./styles/draw.css";

const GRID     = 40;
const ASPECT_W = 16;
const ASPECT_H = 9;
const SIDEBAR  = 180;

function useCanvasSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const calc = useCallback(() => {
    const pad  = 40;
    const maxW = window.innerWidth  - SIDEBAR - pad;
    const maxH = window.innerHeight - pad;
    let w = maxW, h = w * (ASPECT_H / ASPECT_W);
    if (h > maxH) { h = maxH; w = h * (ASPECT_W / ASPECT_H); }
    setSize({ width: Math.floor(w), height: Math.floor(h) });
  }, []);
  useEffect(() => {
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [calc]);
  return size;
}

/** Plain text label — no box, no background, just dark text */
function CanvasLabel({ lb, isSelected, onSelect }: {
  lb: LabelBox; isSelected: boolean; onSelect: () => void;
}) {
  return (
    <Group x={lb.x} y={lb.y} onClick={onSelect} onTap={onSelect}>
      {/* Invisible hit area */}
      <Rect
        width={160} height={24}
        fill="transparent"
      />
      <Text
        x={0} y={0}
        text={lb.text}
        fontSize={13}
        fontStyle="600"
        fill={isSelected ? "#2980b9" : "#1a1a1a"}
        shadowColor={isSelected ? "rgba(41,128,185,0.3)" : "transparent"}
        shadowBlur={isSelected ? 4 : 0}
      />
      {/* Underline hint when selected */}
      {isSelected && (
        <Line
          points={[0, 18, Math.min(lb.text.length * 7.5, 150), 18]}
          stroke="#2980b9" strokeWidth={1} dash={[3, 2]}
        />
      )}
    </Group>
  );
}

export default function Draw() {
  const [phase, setPhase]     = useState<Phase>("outline");
  const canvasSize            = useCanvasSize();
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number } | null>(null);
  const [cursor, setCursor]   = useState("crosshair");

  const outline = useOutline();
  const objects = useObjects();
  const labels  = useLabels();

  const selectedObject = objects.objects.find(o => o.id === objects.selectedId) ?? null;
  const selectedLabel  = labels.labels.find(l => l.id === labels.selectedId)    ?? null;

  const handleNextPhase = useCallback(() => {
    if      (phase === "outline" && outline.closed) setPhase("objects");
    else if (phase === "objects")                   setPhase("labels");
    else if (phase === "labels")                    alert("¡Plano finalizado! 🎉");
  }, [phase, outline.closed]);

  const handleMouseDown = useCallback((p: { x: number; y: number }) => {
    if      (phase === "outline") outline.addPoint(p.x, p.y);
    else if (phase === "objects") objects.startDrag(p.x, p.y);
    else if (phase === "labels")  {
      const hit = labels.startDrag(p.x, p.y);
      if (!hit) labels.setSelectedId(null);
    }
  }, [phase, outline, objects, labels]);

  const handleMouseMove = useCallback((p: { x: number; y: number }) => {
    if (phase === "outline") {
      outline.updatePreview(p.x, p.y);
      setHoverPt({ x: snap(p.x), y: snap(p.y) });
    } else if (phase === "objects") {
      objects.moveDrag(p.x, p.y);
      setCursor(objects.isOnHandle(p.x, p.y) ? "nwse-resize" : "default");
    } else if (phase === "labels") {
      labels.moveDrag(p.x, p.y);
    }
  }, [phase, outline, objects, labels]);

  const handleMouseUp    = useCallback(() => { objects.endDrag(); labels.endDrag(); }, [objects, labels]);
  const handleMouseLeave = useCallback(() => { setHoverPt(null); objects.endDrag(); labels.endDrag(); }, [objects, labels]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (phase === "objects" && objects.selectedId) objects.deleteObject(objects.selectedId);
      if (phase === "labels"  && labels.selectedId)  labels.deleteLabel(labels.selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, objects, labels]);

  const outlinePoly  = outline.points.flatMap(p => [p.x, p.y]);
  const stageCursor  = phase === "outline" ? "crosshair" : phase === "objects" ? cursor : "default";

  return (
    <div className="draw-page">
      <LeftSidebar
        phase={phase}
        outlineClosed={outline.closed}
        outlinePointCount={outline.points.length}
        selectedObject={selectedObject}
        selectedLabel={selectedLabel}
        onUndo={outline.undoLastPoint}
        onReset={outline.reset}
        onNextPhase={handleNextPhase}
        onAddObject={kind => objects.addObject(kind, canvasSize.width, canvasSize.height)}
        onFixObject={objects.fixObject}
        onDeleteObject={objects.deleteObject}
        onSetRotation={objects.setRotation}
        onAddLabel={() => labels.addLabel(canvasSize.width / 2 - 40, canvasSize.height / 2 - 10)}
        onFixLabel={labels.fixLabel}
        onDeleteLabel={labels.deleteLabel}
        onUpdateLabelText={labels.updateText}
      />

      <main className="canvas-area" style={{ flex: 1 }}>
        <div className="canvas-wrapper">
          {canvasSize.width > 0 && (
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ cursor: stageCursor }}
              onMouseDown={e => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseDown(p); }}
              onMouseMove={e => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseMove(p); }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              <Layer>
                <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#fff" />

                {/* Grid */}
                {Array.from({ length: Math.floor(canvasSize.width / GRID) + 1 }).map((_, i) => (
                  <Line key={`v${i}`} points={[i * GRID, 0, i * GRID, canvasSize.height]}
                    stroke={i % 4 === 0 ? "#e8e8e8" : "#f5f5f5"} strokeWidth={i % 4 === 0 ? 1 : 0.5} />
                ))}
                {Array.from({ length: Math.floor(canvasSize.height / GRID) + 1 }).map((_, i) => (
                  <Line key={`h${i}`} points={[0, i * GRID, canvasSize.width, i * GRID]}
                    stroke={i % 4 === 0 ? "#e8e8e8" : "#f5f5f5"} strokeWidth={i % 4 === 0 ? 1 : 0.5} />
                ))}

                {/* Room fill */}
                {phase !== "outline" && outline.closed && outlinePoly.length >= 6 && (
                  <Line points={outlinePoly} closed fill="rgba(235,242,255,0.7)" stroke="transparent" />
                )}

                {/* Walls */}
                {outline.lines.map(ln => (
                  <Line key={ln.id} points={[ln.x1, ln.y1, ln.x2, ln.y2]}
                    stroke={phase === "outline" ? "#1a1a1a" : "#333"}
                    strokeWidth={phase === "outline" ? 2 : 3} />
                ))}

                {/* Vertex dots */}
                {phase === "outline" && outline.points.map((pt, i) => (
                  <Group key={i}>
                    <Circle x={pt.x} y={pt.y}
                      radius={i === 0 && outline.points.length >= 3 ? 8 : 4}
                      fill={i === 0 ? "#2980b9" : "#1a1a1a"}
                      stroke={i === 0 ? "#fff" : "transparent"} strokeWidth={2} />
                    {i === 0 && outline.points.length >= 3 && (
                      <Circle x={pt.x} y={pt.y} radius={13}
                        stroke="#2980b9" strokeWidth={1.5} dash={[4, 3]} fill="transparent" />
                    )}
                  </Group>
                ))}

                {/* Preview line */}
                {phase === "outline" && !outline.closed && outline.points.length > 0 && hoverPt && (
                  <>
                    <Line
                      points={[outline.points[outline.points.length - 1].x, outline.points[outline.points.length - 1].y, hoverPt.x, hoverPt.y]}
                      stroke="#2980b9" strokeWidth={1.5} dash={[6, 4]} />
                    <Circle x={hoverPt.x} y={hoverPt.y} radius={4} fill="#2980b9" opacity={0.6} />
                  </>
                )}

                {/* Objects */}
                {(phase === "objects" || phase === "labels") && objects.objects.map(obj => (
                  <ObjectSymbol
                    key={obj.id} obj={obj}
                    isSelected={obj.id === objects.selectedId && phase === "objects"}
                    onSelect={() => { if (phase === "objects" && !obj.fixed) objects.setSelectedId(obj.id); }}
                  />
                ))}

                {/* Labels — plain text, no box */}
                {phase === "labels" && labels.labels.map(lb => (
                  <CanvasLabel
                    key={lb.id} lb={lb}
                    isSelected={lb.id === labels.selectedId}
                    onSelect={() => labels.setSelectedId(lb.id)}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>
      </main>
    </div>
  );
}