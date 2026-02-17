import type { Phase, ObjectKind, PlacedObject, LabelBox } from "../types";

type Props = {
  phase:             Phase;
  outlineClosed:     boolean;
  outlinePointCount: number;
  selectedObject:    PlacedObject | null;
  selectedLabel:     LabelBox | null;
  onUndo:            () => void;
  onReset:           () => void;
  onNextPhase:       () => void;
  onAddObject:       (kind: ObjectKind) => void;
  onFixObject:       (id: string) => void;
  onDeleteObject:    (id: string) => void;
  onSetRotation:     (id: string, deg: number) => void;
  onAddLabel:        () => void;
  onFixLabel:        (id: string) => void;
  onDeleteLabel:     (id: string) => void;
  onUpdateLabelText: (id: string, text: string) => void;
};

const SHAPES: { kind: ObjectKind; icon: string; label: string }[] = [
  { kind: "rect",   icon: "▭",  label: "Rectángulo" },
  { kind: "circle", icon: "○",  label: "Círculo"    },
  { kind: "line",   icon: "╱",  label: "Línea"      },
  { kind: "door",   icon: "🚪", label: "Puerta"     },
  { kind: "window", icon: "🪟", label: "Ventana"    },
];

const phaseLabel: Record<Phase, string> = {
  outline: "① Contorno",
  objects: "② Formas",
  labels:  "③ Texto",
};
const phaseHint: Record<Phase, string> = {
  outline: "Clic en la cuadrícula para añadir vértices. Cierra haciendo clic en el primer punto.",
  objects: "Añade formas, arrástralas y usa la esquina ↘ para redimensionar. Aplica para fijar.",
  labels:  "Añade etiquetas de texto y arrástralas al sitio.",
};

export default function LeftSidebar({
  phase, outlineClosed, outlinePointCount,
  selectedObject, selectedLabel,
  onUndo, onReset, onNextPhase,
  onAddObject, onFixObject, onDeleteObject, onSetRotation,
  onAddLabel, onFixLabel, onDeleteLabel, onUpdateLabelText,
}: Props) {
  return (
    <aside className="sidebar sidebar-left" style={{ width: 180 }}>

      {/* Phase bar */}
      <div style={{ paddingBottom: 10, borderBottom: "1px solid #eee", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {(["outline", "objects", "labels"] as Phase[]).map(p => {
            const order = { outline: 0, objects: 1, labels: 2 } as Record<Phase, number>;
            return (
              <div key={p} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: phase === p ? "#1a1a1a" : order[phase] > order[p] ? "#aaa" : "#eee",
              }} />
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#222" }}>{phaseLabel[phase]}</p>
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#888", lineHeight: 1.4 }}>{phaseHint[phase]}</p>
      </div>

      {/* ─── PHASE 1 ─────────────────────────────────── */}
      {phase === "outline" && (
        <>
          <div className="sidebar-section">
            <span className="section-label">Acciones</span>
            <button className="action-btn" onClick={onUndo} disabled={outlinePointCount === 0}>↩ Deshacer punto</button>
            <button className="action-btn danger" onClick={onReset} disabled={outlinePointCount === 0}>🗑 Reiniciar</button>
          </div>
          <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: 10 }}>
            <button
              className="action-btn"
              style={{ background: outlineClosed ? "#1a1a1a" : "#ccc", color: "#fff", border: "none", fontWeight: 600, cursor: outlineClosed ? "pointer" : "not-allowed" }}
              onClick={() => outlineClosed && onNextPhase()}
            >
              Siguiente →
            </button>
            {!outlineClosed && outlinePointCount >= 3 && (
              <p style={{ fontSize: 10, color: "#aaa", margin: "6px 0 0", textAlign: "center" }}>Clic en el primer punto para cerrar</p>
            )}
            {!outlineClosed && outlinePointCount > 0 && outlinePointCount < 3 && (
              <p style={{ fontSize: 10, color: "#aaa", margin: "6px 0 0", textAlign: "center" }}>Mínimo 3 puntos</p>
            )}
          </div>
        </>
      )}

      {/* ─── PHASE 2 ─────────────────────────────────── */}
      {phase === "objects" && (
        <>
          <div className="sidebar-section">
            <span className="section-label">Añadir forma</span>
            <div className="tool-list">
              {SHAPES.map(s => (
                <button key={s.kind} className="tool-btn" onClick={() => onAddObject(s.kind)}>
                  <span className="tool-icon">{s.icon}</span>
                  <span className="tool-label">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inline inspector */}
          {selectedObject && !selectedObject.fixed && (
            <div style={{
              marginTop: 8, padding: "10px 8px",
              background: "#f7f9ff", borderRadius: 8,
              border: "1px solid #dde5f5",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#555" }}>
                {selectedObject.label}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: "#aaa" }}>
                {Math.round(selectedObject.width)}×{Math.round(selectedObject.height)} px
              </p>

              {/* Rotation slider */}
              <div>
                <label style={{ fontSize: 10, color: "#666", display: "flex", justifyContent: "space-between" }}>
                  <span>↻ Rotación</span>
                  <span style={{ fontWeight: 600 }}>{Math.round(selectedObject.rotation)}°</span>
                </label>
                <input
                  type="range"
                  min={0} max={359} step={1}
                  value={selectedObject.rotation}
                  onChange={e => onSetRotation(selectedObject.id, Number(e.target.value))}
                  style={{ width: "100%", marginTop: 4, cursor: "pointer" }}
                />
              </div>

              <button
                className="action-btn"
                style={{ background: "#1a1a1a", color: "#fff", border: "none", fontWeight: 600, fontSize: 11 }}
                onClick={() => onFixObject(selectedObject.id)}
              >
                ✓ Aplicar y fijar
              </button>
              <button className="action-btn danger" style={{ fontSize: 11 }} onClick={() => onDeleteObject(selectedObject.id)}>
                ✕ Eliminar
              </button>
            </div>
          )}

          {selectedObject && selectedObject.fixed && (
            <div style={{ marginTop: 8, padding: 8, background: "#f5f5f5", borderRadius: 8, fontSize: 10, color: "#bbb", textAlign: "center" }}>
              Objeto fijado
            </div>
          )}

          <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: 10 }}>
            <button className="action-btn" style={{ background: "#1a1a1a", color: "#fff", border: "none", fontWeight: 600 }} onClick={onNextPhase}>
              Siguiente →
            </button>
          </div>
        </>
      )}

      {/* ─── PHASE 3 ─────────────────────────────────── */}
      {phase === "labels" && (
        <>
          <div className="sidebar-section">
            <span className="section-label">Texto</span>
            <button className="tool-btn" onClick={onAddLabel}>
              <span className="tool-icon">Aa</span>
              <span className="tool-label">Añadir texto</span>
            </button>
          </div>

          {selectedLabel && !selectedLabel.fixed && (
            <div style={{
              marginTop: 8, padding: "10px 8px",
              background: "#fafafa", borderRadius: 8,
              border: "1px solid #eee",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "#555" }}>Contenido</p>
              <input
                type="text"
                style={{
                  width: "100%", padding: "5px 8px",
                  borderRadius: 6, border: "1px solid #ddd",
                  fontSize: 12, boxSizing: "border-box", fontFamily: "inherit",
                }}
                value={selectedLabel.text}
                onChange={e => onUpdateLabelText(selectedLabel.id, e.target.value)}
                autoFocus
                placeholder="Mesa, Cocina…"
              />
              <button
                className="action-btn"
                style={{ background: "#1a1a1a", color: "#fff", border: "none", fontWeight: 600, fontSize: 11 }}
                onClick={() => onFixLabel(selectedLabel.id)}
              >
                ✓ Fijar
              </button>
              <button className="action-btn danger" style={{ fontSize: 11 }} onClick={() => onDeleteLabel(selectedLabel.id)}>
                ✕ Eliminar
              </button>
            </div>
          )}

          <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: 10 }}>
            <button className="action-btn" style={{ background: "#1a1a1a", color: "#fff", border: "none", fontWeight: 600 }} onClick={onNextPhase}>
              Finalizar ✓
            </button>
          </div>
        </>
      )}
    </aside>
  );
}