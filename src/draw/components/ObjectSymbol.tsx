import { Group, Rect, Circle, Line, Arc } from "react-konva";
import type { PlacedObject } from "../types";

const HANDLE = 12;
const ROTATE_HANDLE_OFFSET = 40;

type Props = {
  obj:        PlacedObject;
  isSelected: boolean;
  onSelect:   () => void;
  onRotateStart?: (id: string) => void;
};

export function ObjectSymbol({ obj, isSelected, onSelect, onRotateStart }: Props) {
  const { kind, x, y, width: w, height: h, rotation } = obj;
  const stroke = "#1a1a1a";
  const sw     = 2;
  const sel    = isSelected ? { shadowColor: "#2980b9", shadowBlur: 9, shadowOpacity: 0.65 } : {};

  return (
    <Group
      x={x + w / 2}
      y={y + h / 2}
      rotation={rotation}
      offsetX={w / 2}
      offsetY={h / 2}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* ── rect ── */}
      {kind === "rect" && (
        <Rect width={w} height={h}
          fill="rgba(200,220,255,0.15)" stroke={stroke} strokeWidth={sw} {...sel} />
      )}

      {/* ── circle ── */}
      {kind === "circle" && (
        <Circle x={w / 2} y={h / 2} radius={w / 2}
          fill="rgba(200,220,255,0.15)" stroke={stroke} strokeWidth={sw} {...sel} />
      )}

      {/* ── line ── */}
      {kind === "line" && (
        <Line points={[0, h / 2, w, h / 2]}
          stroke={stroke} strokeWidth={sw + 1} lineCap="round" {...sel} />
      )}

      {/* ── door: hinge + panel + swing arc ── */}
      {kind === "door" && (
        <Group {...sel}>
          <Line points={[0, 0, 0, h]} stroke={stroke} strokeWidth={sw + 1} />
          <Line points={[0, 0, w, 0]} stroke={stroke} strokeWidth={sw} />
          <Arc
            x={0} y={0}
            innerRadius={0} outerRadius={w}
            angle={90}
            fill="rgba(160,200,255,0.22)"
            stroke={stroke} strokeWidth={sw}
          />
        </Group>
      )}

      {/* ── window: frame + divider ── */}
      {kind === "window" && (
        <Group {...sel}>
          <Rect width={w} height={h} fill="#d4eeff" stroke={stroke} strokeWidth={sw + 1} />
          <Line points={[w / 2, 0, w / 2, h]} stroke={stroke} strokeWidth={sw} />
          <Line points={[w * 0.1, h / 2, w * 0.4, h / 2]} stroke={stroke} strokeWidth={1} />
          <Line points={[w * 0.6, h / 2, w * 0.9, h / 2]} stroke={stroke} strokeWidth={1} />
        </Group>
      )}

      {/* ── Selection dashed border ── */}
      {isSelected && (
        <Rect x={-5} y={-5} width={w + 10} height={h + 10}
          stroke="#2980b9" strokeWidth={1.5} dash={[6, 3]} fill="transparent"
        />
      )}

      {/* ── Resize handle (bottom-right) ── */}
      {isSelected && (
        <Group x={w} y={h}>
          <Rect
            x={-HANDLE / 2} y={-HANDLE / 2}
            width={HANDLE} height={HANDLE}
            fill="#2980b9" stroke="#fff" strokeWidth={1.5} cornerRadius={2}
          />
          <Line points={[-3, 2, 2, 2, 2, -3]} stroke="#fff" strokeWidth={1.5} />
        </Group>
      )}

      {/* ── Rotation handle (top center) ── */}
      {isSelected && (
        <Group
          x={w / 2}
          y={-ROTATE_HANDLE_OFFSET}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            if (onRotateStart) onRotateStart(obj.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            if (onRotateStart) onRotateStart(obj.id);
          }}
        >
          {/* Line connecting to object */}
          <Line points={[0, 0, 0, ROTATE_HANDLE_OFFSET - 5]} stroke="#2980b9" strokeWidth={1} dash={[3, 2]} />
          
          {/* Circular handle */}
          <Circle
            radius={10}
            fill="#fff"
            stroke="#2980b9"
            strokeWidth={2}
            shadowColor="rgba(0,0,0,0.2)"
            shadowBlur={4}
            shadowOffsetY={2}
          />
          <Line points={[-4, 0, 4, 0, 0, -4, 0, 4]} stroke="#2980b9" strokeWidth={1.5} />
        </Group>
      )}
    </Group>
  );
}