import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Stage, Layer, Rect, Circle, Line, Group, Text } from "react-konva";
import type Konva from "konva";
import type { Phase, LabelBox, ObjectKind } from "./draw/types";
import { useOutline, snap } from "./draw/hooks/useOutline";
import { useObjects } from "./draw/hooks/useObjects";
import { useLabels } from "./draw/hooks/useLabels";
import { ObjectSymbol } from "./draw/components/ObjectSymbol";
import LeftSidebar from "./draw/components/LeftSidebar";
import Editor from "./Editor";
import "./styles/draw.css";

const GRID     = 20;
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
function CanvasLabel({ lb, isSelected, onSelect, onDoubleClick }: {
  lb: LabelBox; isSelected: boolean; onSelect: () => void; onDoubleClick: () => void;
}) {
  const estimatedW = Math.max(60, lb.text.length * 7.8 + 4);
  return (
    <Group 
      x={lb.x} 
      y={lb.y} 
      onClick={onSelect} 
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
    >
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
  const stageRef = useRef<Konva.Stage>(null);

  // Drag & drop state
  const [draggingTool, setDraggingTool] = useState<ObjectKind | "text" | null>(null);
  
  // Rotation state
  const [rotatingObject, setRotatingObject] = useState<string | null>(null);
  
  // Inline text editing state
  const [editingLabel, setEditingLabel] = useState<string | null>(null);

  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreview, setExportPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result3D, setResult3D] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

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
    // elements phase
    if (selectedObject) return `${selectedObject.label} seleccionado — arrastra, gira o elimina`;
    if (selectedLabel) return "Etiqueta seleccionada — edita el texto o muévela";
    return "Añade formas, puertas, ventanas o texto al plano";
  }, [phase, outline.closed, outline.points.length, selectedObject, selectedLabel]);

  // Phase navigation
  const handleNextPhase = useCallback(() => {
    if (phase === "outline" && outline.closed) {
      setPhase("elements");
    }
  }, [phase, outline.closed]);

  // Finish and export
  const handleFinish = useCallback(() => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 3 });
      setExportPreview(dataURL);
      setShowExportModal(true);
    }
  }, []);

  // Drag & Drop handlers
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage || !draggingTool) return;

    // Get canvas-relative position
    const rect = stage.container().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingTool === "text") {
      labels.placeLabel(x, y);
    } else {
      objects.placeObject(draggingTool, x, y);
    }
    setDraggingTool(null);
  }, [draggingTool, labels, objects]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Rotation handlers
  const handleRotateStart = useCallback((id: string) => {
    setRotatingObject(id);
    objects.setSelectedId(id);
  }, [objects]);

  const handleRotateMove = useCallback((p: { x: number; y: number }) => {
    if (!rotatingObject) return;
    const obj = objects.objects.find(o => o.id === rotatingObject);
    if (!obj) return;

    // Calculate angle from object center to mouse
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    const angle = Math.atan2(p.y - cy, p.x - cx) * (180 / Math.PI);
    
    // Adjust so 0° is pointing up
    objects.setRotation(rotatingObject, angle + 90);
  }, [rotatingObject, objects]);

  const handleRotateEnd = useCallback(() => {
    setRotatingObject(null);
  }, []);

  // Inline text editing handlers
  const handleLabelDoubleClick = useCallback((id: string) => {
    setEditingLabel(id);
  }, []);

  const handleLabelEditFinish = useCallback(() => {
    setEditingLabel(null);
  }, []);

  // Generate 3D from canvas
  const handleGenerate3D = async () => {
    if (!exportPreview) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert dataURL to Blob
      const blob = await (await fetch(exportPreview)).blob();
      
      const formData = new FormData();
      formData.append("imagen", blob, "plano.png");

      // Para desarrollo local usa localhost:8000
      // En producción cambia a "/api/generar.php"
      const response = await fetch("http://localhost:8000/generar.php", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar el plano");
      }

      const data = await response.json();
      
      if (data.url) {
        setResult3D(data.url);
      } else if (data.base64) {
        setResult3D(`data:image/jpeg;base64,${data.base64}`);
      } else {
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowExportModal(false);
    setExportPreview(null);
    setResult3D(null);
    setError(null);
    setShowEditor(false);
  };

  // Canvas events
  const handleMouseDown = useCallback((p: { x: number; y: number }) => {
    if (phase === "outline") {
      outline.addPoint(p.x, p.y);
    } else if (phase === "elements") {
      // Try objects first, then labels
      const objHit = objects.hitTest && objects.hitTest(p.x, p.y);
      if (objHit) {
        objects.startDrag(p.x, p.y);
      } else {
        const lblHit = labels.startDrag(p.x, p.y);
        if (!lblHit) {
          labels.setSelectedId(null);
          objects.setSelectedId(null);
        }
      }
    }
  }, [phase, outline, objects, labels]);

  const handleMouseMove = useCallback((p: { x: number; y: number }) => {
    setMouseCoords(p);
    
    // Handle rotation if active
    if (rotatingObject) {
      handleRotateMove(p);
      return;
    }
    
    if (phase === "outline") {
      outline.updatePreview(p.x, p.y);
      setHoverPt({ x: snap(p.x), y: snap(p.y) });
    } else if (phase === "elements") {
      objects.moveDrag(p.x, p.y);
      labels.moveDrag(p.x, p.y);
      if (objects.isOnHandle(p.x, p.y)) {
        setCursor(resizeCursor);
      } else {
        setCursor("default");
      }
    }
  }, [phase, outline, objects, labels, resizeCursor, rotatingObject, handleRotateMove]);

  const handleMouseUp    = useCallback(() => { 
    objects.endDrag(); 
    labels.endDrag(); 
    handleRotateEnd();
  }, [objects, labels, handleRotateEnd]);
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
      if (phase === "elements") {
        if (objects.selectedId) objects.deleteObject(objects.selectedId);
        else if (labels.selectedId) labels.deleteLabel(labels.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, objects, labels]);

  const outlinePoly = outline.points.flatMap(p => [p.x, p.y]);

  const stageCursor =
    phase === "outline" ? "crosshair" :
    phase === "elements" ? cursor :
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
        onStartDragTool={setDraggingTool}
        onDeleteObject={objects.deleteObject}
        onDeleteLabel={labels.deleteLabel}
        onFinish={handleFinish}
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
          <div 
            className="canvas-inner"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          >
            {canvasSize.width > 0 && (
              <Stage
                ref={stageRef}
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
                  {phase === "elements" && objects.objects.map(obj => (
                    <ObjectSymbol
                      key={obj.id} obj={obj}
                      isSelected={obj.id === objects.selectedId}
                      onSelect={() => {
                        objects.setSelectedId(obj.id);
                        labels.setSelectedId(null);
                      }}
                      onRotateStart={handleRotateStart}
                    />
                  ))}

                  {/* Text labels */}
                  {phase === "elements" && labels.labels.map(lb => (
                    <CanvasLabel
                      key={lb.id} lb={lb}
                      isSelected={lb.id === labels.selectedId}
                      onSelect={() => {
                        labels.setSelectedId(lb.id);
                        objects.setSelectedId(null);
                      }}
                      onDoubleClick={() => handleLabelDoubleClick(lb.id)}
                    />
                  ))}
                </Layer>
              </Stage>
            )}

            {/* Inline text editor */}
            {editingLabel && (() => {
              const lb = labels.labels.find(l => l.id === editingLabel);
              if (!lb) return null;
              
              return (
                <input
                  type="text"
                  className="inline-text-editor"
                  style={{
                    position: 'absolute',
                    left: lb.x,
                    top: lb.y,
                    width: Math.max(100, lb.text.length * 8 + 20),
                    height: 24,
                  }}
                  value={lb.text}
                  onChange={e => labels.updateText(editingLabel, e.target.value)}
                  onBlur={handleLabelEditFinish}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      handleLabelEditFinish();
                    }
                  }}
                  autoFocus
                />
              );
            })()}
          </div>
        </div>
      </main>

      {/* Export modal */}
      {showExportModal && (
        <div className="export-modal-overlay" onClick={handleCloseModal}>
          <div className="export-modal" onClick={(e) => e.stopPropagation()}>
            <button className="export-modal-close" onClick={handleCloseModal}>✕</button>
            
            {!result3D ? (
              <>
                <h2 className="export-modal-title">🎉 Plano completado</h2>
                <p className="export-modal-subtitle">
                  Tu plano está listo. Genera una vista 3D equirectangular ahora.
                </p>
                
                {exportPreview && (
                  <img src={exportPreview} alt="Preview" className="export-preview" />
                )}

                {error && (
                  <div className="export-error">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <div className="export-actions">
                  <button
                    className="btn-primary"
                    onClick={handleGenerate3D}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner" />
                        Generando 3D...
                      </>
                    ) : (
                      "🚀 Generar vista 3D"
                    )}
                  </button>
                  <a href={exportPreview || "#"} download="plano.png" className="btn-secondary">
                    ⬇ Descargar plano
                  </a>
                </div>
              </>
            ) : (
              <>
                <h2 className="export-modal-title">✨ Vista 3D generada</h2>
                <img src={result3D} alt="Resultado 3D" className="export-result" />
                <div className="export-actions">
                  <button onClick={() => setShowEditor(true)} className="btn-primary">
                    ✏️ Editar en 3D
                  </button>
                  <a href={result3D} download="plano-3d.jpg" className="btn-secondary">
                    ⬇ Descargar
                  </a>
                  <button className="btn-secondary" onClick={handleCloseModal}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}