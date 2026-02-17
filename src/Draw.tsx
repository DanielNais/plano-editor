import { useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Circle, Line, Group, Text } from "react-konva";
import type { Phase, LabelBox } from "./draw/types";
import { useOutline, snap } from "./draw/hooks/useOutline";
import { useObjects } from "./draw/hooks/useObjects";
import { useLabels } from "./draw/hooks/useLabels";
import { ObjectSymbol } from "./draw/components/ObjectSymbol";
import LeftSidebar from "./draw/components/LeftSidebar";
import "./styles/draw.css";

const GRID     = 40;
const SIDEBAR  = 220;

// Canvas fills the window minus the sidebar
function useCanvasSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const calc = useCallback(() => {
    setSize({
      width:  Math.max(100, window.innerWidth  - SIDEBAR),
      height: Math.max(100, window.innerHeight),
    });
  }, []);
  useEffect(() => {
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [calc]);
  return size;
}

/** Build a rotating resize cursor as an SVG data URI */
function resizeCursorUrl(rotation: number): string {
  const r = rotation;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'>
    <g transform='rotate(${r} 12 12)'>
      <path d='M20 12 L14 6 L14 9 L4 9 L4 15 L14 15 L14 18 Z'
        fill='%231a1a1a' stroke='white' stroke-width='1.5'/>
    </g>
  </svg>`;
  return `url("data:image/svg+xml,${svg}") 12 12, nwse-resize`;
}

/** Plain canvas label */
function CanvasLabel({ lb, isSelected, onSelect }: {
  lb: LabelBox; isSelected: boolean; onSelect: () => void;
}) {
  const estimatedW = Math.max(60, lb.text.length * 7.8 + 4);
  return (
    <Group x={lb.x} y={lb.y} onClick={onSelect} onTap={onSelect}>
      <Rect width={estimatedW} height={20} fill="transparent" />
      <Text
        text={lb.text}
        fontSize={12}
        fontStyle="600"
        fontFamily="'DM Mono', monospace"
        fill={isSelected ? "#3b82f6" : "#1a1a2e"}
        letterSpacing={0.3}
      />
      {isSelected && (
        <Line
          points={[0, 16, estimatedW, 16]}
          stroke="#3b82f6" strokeWidth={1} dash={[3, 2]}
        />
      )}
    </Group>
  );
}

// Canvas colors — paper/blueprint look
const C = {
  bg:        "#f8f7f4",
  gridMinor: "#ede9e0",
  gridMajor: "#d8d3c8",
  wallDraw:  "#1a1a2e",
  wallFixed: "#1a1a2e",
  fill:      "rgba(59,130,246,0.06)",
};

export default function Draw() {
  const [phase, setPhase]       = useState<Phase>("outline");
  const canvasSize              = useCanvasSize();
  const [hoverPt, setHoverPt]   = useState<{ x: number; y: number } | null>(null);
  const [mouseCoords, setMouseCoords] = useState({ x: 0, y: 0 });
  const [cursor, setCursor]     = useState("crosshair");

  const outline = useOutline();
  const objects = useObjects();
  const labels  = useLabels();

  const selectedObject = objects.objects.find(o => o.id === objects.selectedId) ?? null;
  const selectedLabel  = labels.labels.find(l => l.id === labels.selectedId)    ?? null;

  // Rotating resize cursor
  const resizeCursor = useMemo(() => {
    if (!selectedObject) return "nwse-resize";
    return resizeCursorUrl(selectedObject.rotation);
  }, [selectedObject?.rotation]);

  // Status bar message
  const statusMsg = useMemo(() => {
    if (phase === "outline") {
      if (outline.closed) return "Contorno cerrado — pulsa Siguiente para continuar";
      if (outline.points.length === 0) return "Haz clic para empezar a trazar";
      return `${outline.points.length} vértice${outline.points.length > 1 ? "s" : ""} — sigue trazando`;
    }
    if (phase === "objects") {
      if (selectedObject && !selectedObject.fixed)
        return `${selectedObject.label} seleccionado — arrastra o gira`;
      return "Selecciona una forma del panel o haz clic en un elemento";
    }
    return "Añade etiquetas y arrástralas a su posición";
  }, [phase, outline.closed, outline.points.length, selectedObject]);

  // Phase navigation
  const handleNextPhase = useCallback(() => {
    if      (phase === "outline" && outline.closed) setPhase("objects");
    else if (phase === "objects")                   setPhase("labels");
    else if (phase === "labels")                    alert("¡Plano finalizado! 🎉");
  }, [phase, outline.closed]);

  // Canvas events
  const handleMouseDown = useCallback((p: { x: number; y: number }) => {
    if      (phase === "outline") outline.addPoint(p.x, p.y);
    else if (phase === "objects") objects.startDrag(p.x, p.y);
    else if (phase === "labels")  {
      const hit = labels.startDrag(p.x, p.y);
      if (!hit) labels.setSelectedId(null);
    }
  }, [phase, outline, objects, labels]);

  const handleMouseMove = useCallback((p: { x: number; y: number }) => {
    setMouseCoords(p);
    if (phase === "outline") {
      outline.updatePreview(p.x, p.y);
      setHoverPt({ x: snap(p.x), y: snap(p.y) });
    } else if (phase === "objects") {
      objects.moveDrag(p.x, p.y);
      if (objects.isOnHandle(p.x, p.y)) {
        setCursor(resizeCursor);
      } else {
        setCursor("default");
      }
    } else if (phase === "labels") {
      labels.moveDrag(p.x, p.y);
    }
  }, [phase, outline, objects, labels, resizeCursor]);

  const handleMouseUp    = useCallback(() => { objects.endDrag(); labels.endDrag(); }, [objects, labels]);
  const handleMouseLeave = useCallback(() => {
    setHoverPt(null);
    objects.endDrag();
    labels.endDrag();
  }, [objects, labels]);

  // Keyboard
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

  const outlinePoly = outline.points.flatMap(p => [p.x, p.y]);

  const stageCursor =
    phase === "outline" ? "crosshair" :
    phase === "objects" ? cursor :
    "default";

  // Grid lines
  const vLines = Array.from({ length: Math.floor(canvasSize.width  / GRID) + 1 }, (_, i) => i);
  const hLines = Array.from({ length: Math.floor(canvasSize.height / GRID) + 1 }, (_, i) => i);

  // Coordinates in "meters" (1 cell = 0.5m)
  const toM = (px: number) => ((px / GRID) * 0.5).toFixed(1);

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

      <main className="canvas-area">
        {/* Status bar */}
        <div className="status-bar">
          <div className="status-dot" />
          {statusMsg}
        </div>

        {/* Mouse coords */}
        <div className="coords-bar">
          X {toM(mouseCoords.x)} m &nbsp;·&nbsp; Y {toM(mouseCoords.y)} m
        </div>

        <div className="canvas-wrapper">
          <div className="canvas-inner">
            {canvasSize.width > 0 && (
              <Stage
                width={canvasSize.width}
                height={canvasSize.height}
                style={{ cursor: stageCursor, display: "block" }}
                onMouseDown={e => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseDown(p); }}
                onMouseMove={e => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseMove(p); }}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <Layer>
                  {/* Paper background */}
                  <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={C.bg} />

                  {/* Minor grid */}
                  {vLines.map(i => (
                    <Line key={`v${i}`} points={[i * GRID, 0, i * GRID, canvasSize.height]}
                      stroke={i % 4 === 0 ? C.gridMajor : C.gridMinor}
                      strokeWidth={i % 4 === 0 ? 0.8 : 0.4} />
                  ))}
                  {hLines.map(i => (
                    <Line key={`h${i}`} points={[0, i * GRID, canvasSize.width, i * GRID]}
                      stroke={i % 4 === 0 ? C.gridMajor : C.gridMinor}
                      strokeWidth={i % 4 === 0 ? 0.8 : 0.4} />
                  ))}

                  {/* Room fill */}
                  {phase !== "outline" && outline.closed && outlinePoly.length >= 6 && (
                    <Line points={outlinePoly} closed fill={C.fill} stroke="transparent" />
                  )}

                  {/* Walls */}
                  {outline.lines.map(ln => (
                    <Line key={ln.id}
                      points={[ln.x1, ln.y1, ln.x2, ln.y2]}
                      stroke={C.wallFixed}
                      strokeWidth={phase === "outline" ? 2 : 3}
                      lineCap="round" lineJoin="round"
                    />
                  ))}

                  {/* Vertex dots (outline phase only) */}
                  {phase === "outline" && outline.points.map((pt, i) => (
                    <Group key={i}>
                      <Circle x={pt.x} y={pt.y}
                        radius={i === 0 && outline.points.length >= 3 ? 8 : 4}
                        fill={i === 0 ? "#3b82f6" : C.wallDraw}
                        stroke={i === 0 ? "#fff" : "transparent"}
                        strokeWidth={2}
                      />
                      {i === 0 && outline.points.length >= 3 && (
                        <Circle x={pt.x} y={pt.y} radius={13}
                          stroke="#3b82f6" strokeWidth={1.5}
                          dash={[4, 3]} fill="transparent"
                        />
                      )}
                    </Group>
                  ))}

                  {/* Preview line while drawing */}
                  {phase === "outline" && !outline.closed && outline.points.length > 0 && hoverPt && (
                    <>
                      <Line
                        points={[
                          outline.points[outline.points.length - 1].x,
                          outline.points[outline.points.length - 1].y,
                          hoverPt.x, hoverPt.y,
                        ]}
                        stroke="#3b82f6" strokeWidth={1.5} dash={[6, 4]}
                      />
                      <Circle x={hoverPt.x} y={hoverPt.y} radius={4} fill="#3b82f6" opacity={0.7} />
                    </>
                  )}

                  {/* Placed objects */}
                  {(phase === "objects" || phase === "labels") && objects.objects.map(obj => (
                    <ObjectSymbol
                      key={obj.id} obj={obj}
                      isSelected={obj.id === objects.selectedId && phase === "objects"}
                      onSelect={() => { if (phase === "objects" && !obj.fixed) objects.setSelectedId(obj.id); }}
                    />
                  ))}

                  {/* Text labels */}
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
        </div>
      </main>
    </div>
  );
}