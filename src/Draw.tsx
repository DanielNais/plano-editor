import { useState } from "react";
import { Stage, Layer, Rect, Circle } from "react-konva";
import type { Tool } from "./draw/types";
import { useDrawing } from "./draw/hooks/useDrawing";
import "./styles/draw.css";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANVAS_X = 0;
const CANVAS_Y = 0;

export default function Draw() {
  const [tool, setTool] = useState<Tool>("rect");

  const { shapes, handleMouseDown, handleMouseMove, handleMouseUp, undo } =
    useDrawing(tool, CANVAS_X, CANVAS_Y, CANVAS_WIDTH, CANVAS_HEIGHT);

  return (
    <div className="draw-container">
      <div className="toolbar">
        <button
          className={tool === "rect" ? "active" : ""}
          onClick={() => setTool("rect")}
        >
          📦 Rectángulo
        </button>
        <button
          className={tool === "circle" ? "active" : ""}
          onClick={() => setTool("circle")}
        >
          ⭕ Círculo
        </button>
        <button onClick={undo}>↩️ Deshacer</button>
      </div>

      <div className="canvas-wrapper">
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={(e) => {
            const stage = e.target.getStage();
            const pointer = stage?.getPointerPosition();
            if (pointer) handleMouseDown(pointer);
          }}
          onMouseMove={(e) => {
            const stage = e.target.getStage();
            const pointer = stage?.getPointerPosition();
            if (pointer) handleMouseMove(pointer);
          }}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {/* Fondo del canvas */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fill="#fafafa"
              stroke="#ddd"
              strokeWidth={1}
            />

            {/* Renderizar todas las formas */}
            {shapes.map((shape) => {
              if (shape.type === "rect") {
                return (
                  <Rect
                    key={shape.id}
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    stroke="#000000"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                );
              }

              if (shape.type === "circle") {
                return (
                  <Circle
                    key={shape.id}
                    x={shape.x}
                    y={shape.y}
                    radius={shape.radius}
                    stroke="#000000"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                );
              }

              return null;
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
