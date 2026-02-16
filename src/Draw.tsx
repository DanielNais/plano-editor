import { useState } from "react";
import type { Shape, Tool } from "./draw/types";
import { v4 as uuidv4 } from "uuid";

export function useDrawing(
  tool: Tool,
  CANVAS_X: number,
  CANVAS_Y: number,
  CANVAS_WIDTH: number,
  CANVAS_HEIGHT: number
) {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleMouseDown = (pointer: { x: number; y: number }) => {
    if (
      pointer.x < CANVAS_X ||
      pointer.x > CANVAS_X + CANVAS_WIDTH ||
      pointer.y < CANVAS_Y ||
      pointer.y > CANVAS_Y + CANVAS_HEIGHT
    ) {
      return;
    }

    setHistory([...history, shapes]);

    if (tool === "rect") {
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "rect",
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
        },
      ]);
      setIsDrawing(true);
    }

    if (tool === "circle") {
      setShapes([
        ...shapes,
        {
          id: uuidv4(),
          type: "circle",
          x: pointer.x,
          y: pointer.y,
          radius: 0,
        },
      ]);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (pointer: { x: number; y: number }) => {
    if (!isDrawing) return;

    const updated = shapes.map((shape, index) => {
      if (index !== shapes.length - 1) return shape;

      if (shape.type === "rect") {
        return {
          ...shape,
          width: pointer.x - shape.x,
          height: pointer.y - shape.y,
        };
      }

      if (shape.type === "circle") {
        const dx = pointer.x - shape.x;
        const dy = pointer.y - shape.y;
        return {
          ...shape,
          radius: Math.sqrt(dx * dx + dy * dy),
        };
      }

      return shape;
    });

    setShapes(updated);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setShapes(previous);
    setHistory(history.slice(0, history.length - 1));
  };

  return {
    shapes,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    undo,
  };
}
