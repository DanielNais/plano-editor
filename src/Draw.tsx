import { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer, Rect, Circle, Line, Group } from "react-konva";
import type Konva from "konva";
import type { Tool, Shape } from "./draw/types";
import { useDrawing } from "./draw/hooks/useDrawing";
import LayerPanel from "./draw/components/LayerPanel";
import "./styles/draw.css";

const ASPECT_W = 16;
const ASPECT_H = 9;

function useCanvasSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const calc = useCallback(() => {
    const sideL = 170;
    const sideR = 240;
    const pad = 40;
    const maxW = window.innerWidth - sideL - sideR - pad;
    const maxH = window.innerHeight - pad;
    let w = maxW;
    let h = w * (ASPECT_H / ASPECT_W);
    if (h > maxH) { h = maxH; w = h * (ASPECT_W / ASPECT_H); }
    setSize({ width: Math.floor(w), height: Math.floor(h) });
  }, []);
  useEffect(() => { calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc); }, [calc]);
  return size;
}

/** Render a single shape (without eraser) */
function ShapeRenderer({ shape, strokeColor, strokeWidth, isSelected }: {
  shape: Shape; strokeColor: string; strokeWidth: number; isSelected: boolean;
}) {
  const sel = isSelected ? { shadowColor: "#2980b9", shadowBlur: 8, shadowOpacity: 0.6 } : {};

  if (shape.type === "rect") {
    return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} stroke={strokeColor} strokeWidth={strokeWidth} {...sel} />;
  }
  if (shape.type === "circle") {
    return <Circle x={shape.x} y={shape.y} radius={shape.radius} stroke={strokeColor} strokeWidth={strokeWidth} {...sel} />;
  }
  if (shape.type === "line") {
    return <Line points={shape.points} stroke={strokeColor} strokeWidth={strokeWidth} {...sel} />;
  }
  if (shape.type === "free") {
    return <Line points={shape.points} stroke={strokeColor} strokeWidth={strokeWidth} tension={0.5} lineCap="round" lineJoin="round" {...sel} />;
  }
  return null;
}

/**
 * Each shape is rendered inside its own Group that is cached as a bitmap.
 * The eraser strokes use globalCompositeOperation: "destination-out"
 * which truly removes pixels — no white color, just transparency.
 * The Group caching is key: destination-out only affects the cached bitmap,
 * not the whole stage.
 */
function ShapeWithEraser({ shape, strokeColor, strokeWidth, isSelected }: {
  shape: Shape; strokeColor: string; strokeWidth: number; isSelected: boolean;
}) {
  const groupRef = useRef<Konva.Group>(null);

  // Re-cache whenever shape changes
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.cache({ pixelRatio: 2 });
    }
  });

  const hasEraser = shape.eraserStrokes.length > 0;

  if (!hasEraser) {
    // No eraser strokes — render normally (no caching needed)
    return (
      <Group>
        <ShapeRenderer shape={shape} strokeColor={strokeColor} strokeWidth={strokeWidth} isSelected={isSelected} />
      </Group>
    );
  }

  return (
    <Group ref={groupRef}>
      <ShapeRenderer shape={shape} strokeColor={strokeColor} strokeWidth={strokeWidth} isSelected={isSelected} />
      {shape.eraserStrokes.map((es, idx) => (
        <Line
          key={idx}
          points={es.points}
          stroke="#000000"
          strokeWidth={es.width}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation="destination-out"
        />
      ))}
    </Group>
  );
}

export default function Draw() {
  const [tool, setTool] = useState<Tool>("rect");
  const canvasSize = useCanvasSize();

  const {
    shapes,
    selectedId,
    setSelectedId,
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
    canUndo,
    canRedo,
    STROKE_COLOR,
    STROKE_WIDTH,
  } = useDrawing(tool, canvasSize.width, canvasSize.height);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !(document.activeElement instanceof HTMLInputElement)) {
          e.preventDefault();
          deleteShape(selectedId);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedId, deleteShape]);

  const tools: { key: Tool; icon: string; label: string }[] = [
    { key: "move", icon: "🖐️", label: "Mover" },
    { key: "rect", icon: "▭", label: "Rectángulo" },
    { key: "circle", icon: "○", label: "Círculo" },
    { key: "line", icon: "╱", label: "Línea" },
    { key: "free", icon: "✏️", label: "Libre" },
    { key: "eraser", icon: "🧹", label: "Goma" },
  ];

  const getCursor = () => {
    if (tool === "move") return "grab";
    if (tool === "eraser") return "cell";
    return "crosshair";
  };

  return (
    <div className="draw-page">
      {/* ── Left sidebar ── */}
      <aside className="sidebar sidebar-left">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Crea tu propio plano</h1>
        </div>

        <div className="sidebar-section">
          <span className="section-label">Herramientas</span>
          <div className="tool-list">
            {tools.map((t) => (
              <button
                key={t.key}
                className={`tool-btn ${tool === t.key ? "active" : ""}`}
                onClick={() => setTool(t.key)}
              >
                <span className="tool-icon">{t.icon}</span>
                <span className="tool-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {tool === "eraser" && (
          <div className="sidebar-section">
            <p className="hint-text">
              Pasa la goma por encima de cualquier forma para recortar partes — ideal para ventanas, puertas, huecos…
            </p>
          </div>
        )}

        {tool === "move" && (
          <div className="sidebar-section">
            <p className="hint-text">
              Haz clic en una forma y arrástrala. También puedes seleccionar capas en el panel derecho.
            </p>
          </div>
        )}

        <div className="sidebar-section sidebar-actions">
          <button className="action-btn" onClick={undo} disabled={!canUndo} title="Ctrl+Z">↩ Deshacer</button>
          <button className="action-btn" onClick={redo} disabled={!canRedo} title="Ctrl+Y">↪ Rehacer</button>
          <button className="action-btn danger" onClick={clearAll}>🗑 Limpiar todo</button>
        </div>
      </aside>

      {/* ── Canvas ── */}
      <main className="canvas-area">
        <div className="canvas-wrapper">
          {canvasSize.width > 0 && (
            <Stage
              width={canvasSize.width}
              height={canvasSize.height}
              style={{ cursor: getCursor() }}
              onMouseDown={(e) => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseDown(p); }}
              onMouseMove={(e) => { const p = e.target.getStage()?.getPointerPosition(); if (p) handleMouseMove(p); }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <Layer>
                {/* Background */}
                <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#ffffff" />

                {/* Grid */}
                {Array.from({ length: Math.floor(canvasSize.width / 40) + 1 }).map((_, i) => (
                  <Line key={`v${i}`} points={[i * 40, 0, i * 40, canvasSize.height]} stroke="#f3f3f3" strokeWidth={1} />
                ))}
                {Array.from({ length: Math.floor(canvasSize.height / 40) + 1 }).map((_, i) => (
                  <Line key={`h${i}`} points={[0, i * 40, canvasSize.width, i * 40]} stroke="#f3f3f3" strokeWidth={1} />
                ))}

                {/* Shapes */}
                {shapes.map((shape) => {
                  if (!shape.visible) return null;
                  return (
                    <ShapeWithEraser
                      key={shape.id}
                      shape={shape}
                      strokeColor={STROKE_COLOR}
                      strokeWidth={STROKE_WIDTH}
                      isSelected={shape.id === selectedId}
                    />
                  );
                })}
              </Layer>
            </Stage>
          )}
        </div>
      </main>

      {/* ── Right sidebar: layers ── */}
      <aside className="sidebar sidebar-right">
        <LayerPanel
          shapes={shapes}
          selectedId={selectedId}
          onSelect={(id) => { setSelectedId(id); if (tool !== "move") setTool("move"); }}
          onDelete={deleteShape}
          onToggleVisibility={toggleVisibility}
          onToggleLock={toggleLock}
          onMoveUp={moveLayerUp}
          onMoveDown={moveLayerDown}
          onRename={renameShape}
        />
      </aside>
    </div>
  );
}