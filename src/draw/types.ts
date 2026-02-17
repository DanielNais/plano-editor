export type Phase = "outline" | "objects" | "labels";

export type OutlinePoint = { x: number; y: number };
export type OutlineLine  = { id: string; x1: number; y1: number; x2: number; y2: number };

export type ObjectKind = "rect" | "circle" | "line" | "door" | "window";

export type PlacedObject = {
  id:       string;
  kind:     ObjectKind;
  label:    string;
  x:        number;
  y:        number;
  width:    number;
  height:   number;
  rotation: number;   // degrees
  fixed:    boolean;
};

export type LabelBox = {
  id:    string;
  text:  string;
  x:     number;
  y:     number;
  fixed: boolean;
};