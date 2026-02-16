export type Tool = "rect" | "circle" | "line" | "free" | "move" | "eraser";

export type EraserStroke = {
  points: number[];
  width: number;
};

type ShapeBase = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  eraserStrokes: EraserStroke[];
};

export type RectShape = ShapeBase & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CircleShape = ShapeBase & {
  type: "circle";
  x: number;
  y: number;
  radius: number;
};

export type LineShape = ShapeBase & {
  type: "line";
  points: number[];
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FreeShape = ShapeBase & {
  type: "free";
  points: number[];
};

export type Shape = RectShape | CircleShape | LineShape | FreeShape;