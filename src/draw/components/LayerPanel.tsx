import type { Shape } from "../types";

type Props = {
  shapes: Shape[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

const typeIcons: Record<string, string> = {
  rect: "▭",
  circle: "○",
  line: "╱",
  free: "✏️",
};

export default function LayerPanel({
  shapes,
  selectedId,
  onSelect,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onRename,
}: Props) {
  const reversed = [...shapes].reverse();

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <span className="section-label">Capas ({shapes.length})</span>
      </div>

      {reversed.length === 0 && <p className="layer-empty">Sin capas aún</p>}

      <div className="layer-list">
        {reversed.map((shape) => {
          const isSelected = shape.id === selectedId;
          return (
            <div
              key={shape.id}
              className={`layer-item ${isSelected ? "selected" : ""} ${!shape.visible ? "hidden-layer" : ""} ${shape.locked ? "locked-layer" : ""}`}
              onClick={() => onSelect(shape.id)}
            >
              <span className="layer-type-icon">{typeIcons[shape.type] ?? "?"}</span>
              <input
                className="layer-name"
                value={shape.name}
                onChange={(e) => onRename(shape.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="layer-actions">
                <button className="layer-btn" onClick={(e) => { e.stopPropagation(); onMoveUp(shape.id); }} title="Subir">▲</button>
                <button className="layer-btn" onClick={(e) => { e.stopPropagation(); onMoveDown(shape.id); }} title="Bajar">▼</button>
                <button className={`layer-btn ${!shape.visible ? "off" : ""}`} onClick={(e) => { e.stopPropagation(); onToggleVisibility(shape.id); }} title={shape.visible ? "Ocultar" : "Mostrar"}>
                  {shape.visible ? "👁" : "👁‍🗨"}
                </button>
                <button className={`layer-btn ${shape.locked ? "off" : ""}`} onClick={(e) => { e.stopPropagation(); onToggleLock(shape.id); }} title={shape.locked ? "Desbloquear" : "Bloquear"}>
                  {shape.locked ? "🔒" : "🔓"}
                </button>
                <button className="layer-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(shape.id); }} title="Eliminar capa">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}