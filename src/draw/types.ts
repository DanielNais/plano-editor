export type Tool = "rect" | "circle" | "line" | "free" | "erase";

export type RectShape = {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CircleShape = {
  id: string;
  type: "circle";
  x: number;
  y: number;
  radius: number;
};

export type Shape = RectShape | CircleShape;
