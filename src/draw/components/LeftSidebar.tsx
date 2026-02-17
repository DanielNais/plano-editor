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
  { kind: "rect",   icon: "□",  label: "Rectángulo" },
  { kind: "circle", icon: "◯",  label: "Círculo"    },
  { kind: "line",   icon: "—",  label: "Línea"      },
  { kind: "door",   icon: "⌒",  label: "Puerta"     },
  { kind: "window", icon: "⊟",  label: "Ventana"    },
];

const PHASE_STEPS: { key: Phase; label: string; short: string }[] = [
  { key: "outline", label: "Contorno",  short: "01" },
  { key: "objects", label: "Elementos", short: "02" },
  { key: "labels",  label: "Texto",     short: "03" },
];

const PHASE_HINTS: Record<Phase, string> = {
  outline: "Clic en la cuadrícula para añadir vértices. Cierra la forma sobre el primer punto.",
  objects: "Arrastra para mover. Esquina ↘ para redimensionar. Gira con el slider.",
  labels:  "Añade etiquetas de texto y arrástralas a su posición.",
};

const ORDER: Record<Phase, number> = { outline: 0, objects: 1, labels: 2 };

export default function LeftSidebar({
  phase, outlineClosed, outlinePointCount,
  selectedObject, selectedLabel,
  onUndo, onReset, onNextPhase,
  onAddObject, onFixObject, onDeleteObject, onSetRotation,
  onAddLabel, onFixLabel, onDeleteLabel, onUpdateLabelText,
}: Props) {

  const nextEnabled =
    (phase === "outline" && outlineClosed) ||
    phase === "objects" ||
    phase === "labels";

  return (
    <aside className="sidebar" style={{ width: 220 }}>

      {/* ── Logo / header ── */}
      <div className="sidebar-header">
        <div className="app-logo">
          <div className="app-logo-mark">⌖</div>
          <div>
            <div className="app-logo-name">PlanEditor</div>
            <div className="app-logo-tag">Floor Plan Tool</div>
          </div>
        </div>

        {/* Phase progress */}
        <div className="phase-bar">
          {PHASE_STEPS.map(s => (
            <div key={s.key} className="phase-pip" style={{
              background:
                phase === s.key ? 'var(--accent)' :
                ORDER[phase] > ORDER[s.key] ? 'var(--border2)' : 'var(--text-faint)',
              opacity: phase === s.key ? 1 : ORDER[phase] > ORDER[s.key] ? 0.5 : 0.2,
            }} />
          ))}
        </div>
        <div className="phase-title">
          {PHASE_STEPS.find(s => s.key === phase)?.short} &nbsp;{PHASE_STEPS.find(s => s.key === phase)?.label}
        </div>
        <div className="phase-hint">{PHASE_HINTS[phase]}</div>
      </div>

      {/* ── Body ── */}
      <div className="sidebar-body">

        {/* ─── PHASE 1 ─── */}
        {phase === "outline" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="section-label" style={{ marginTop: 4 }}>Edición</span>
            <button className="action-btn" onClick={onUndo} disabled={outlinePointCount === 0}>
              <span>↩</span> Deshacer punto
            </button>
            <button className="action-btn danger" onClick={onReset} disabled={outlinePointCount === 0}>
              <span>✕</span> Reiniciar
            </button>

            {outlinePointCount > 0 && !outlineClosed && (
              <div style={{
                marginTop: 8, padding: "10px",
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "var(--radius-sm)",
                fontSize: 10, color: "var(--accent)", lineHeight: 1.5,
              }}>
                {outlinePointCount < 3
                  ? `${outlinePointCount} punto${outlinePointCount > 1 ? "s" : ""} — necesitas al menos 3`
                  : `${outlinePointCount} puntos — clic en el inicio para cerrar`}
              </div>
            )}

            {outlineClosed && (
              <div style={{
                marginTop: 8, padding: "10px",
                background: "rgba(34,197,94,0.06)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "var(--radius-sm)",
                fontSize: 10, color: "var(--success)", lineHeight: 1.5,
              }}>
                ✓ Contorno cerrado
              </div>
            )}
          </div>
        )}

        {/* ─── PHASE 2 ─── */}
        {phase === "objects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="section-label" style={{ marginTop: 4 }}>Formas</span>
            <div className="tool-list">
              {SHAPES.map(s => (
                <button key={s.kind} className="tool-btn" onClick={() => onAddObject(s.kind)}>
                  <span className="tool-icon">{s.icon}</span>
                  <span className="tool-label">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Inspector */}
            {selectedObject && !selectedObject.fixed && (
              <div className="inspector-card">
                <div>
                  <div className="inspector-label">{selectedObject.label}</div>
                  <div className="inspector-sub">
                    {Math.round(selectedObject.width)} × {Math.round(selectedObject.height)} px
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <div className="rotation-row" style={{ marginBottom: 6 }}>
                    <span className="rotation-label">↻ Rotación</span>
                    <span className="rotation-value">{Math.round(selectedObject.rotation)}°</span>
                  </div>
                  <input
                    type="range" min={0} max={359} step={1}
                    value={selectedObject.rotation}
                    onChange={e => onSetRotation(selectedObject.id, Number(e.target.value))}
                  />
                </div>

                <button className="action-btn primary" onClick={() => onFixObject(selectedObject.id)}>
                  ✓ Aplicar y fijar
                </button>
                <button className="action-btn danger" onClick={() => onDeleteObject(selectedObject.id)}>
                  <span>✕</span> Eliminar
                </button>
              </div>
            )}

            {selectedObject?.fixed && (
              <div className="fixed-badge">Elemento fijado</div>
            )}
          </div>
        )}

        {/* ─── PHASE 3 ─── */}
        {phase === "labels" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="section-label" style={{ marginTop: 4 }}>Etiquetas</span>
            <button className="tool-btn" onClick={onAddLabel}>
              <span className="tool-icon" style={{ fontFamily: "serif", fontStyle: "italic" }}>Aa</span>
              <span className="tool-label">Añadir texto</span>
            </button>

            {selectedLabel && !selectedLabel.fixed && (
              <div className="inspector-card">
                <div className="inspector-label">Editar</div>
                <input
                  type="text"
                  className="text-input"
                  value={selectedLabel.text}
                  onChange={e => onUpdateLabelText(selectedLabel.id, e.target.value)}
                  autoFocus
                  placeholder="Mesa, Cocina, Dormitorio…"
                />
                <button className="action-btn primary" onClick={() => onFixLabel(selectedLabel.id)}>
                  ✓ Fijar
                </button>
                <button className="action-btn danger" onClick={() => onDeleteLabel(selectedLabel.id)}>
                  <span>✕</span> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer: next/finish ── */}
      <div className="sidebar-footer">
        <button
          className="action-btn primary"
          disabled={!nextEnabled}
          onClick={onNextPhase}
        >
          {phase === "labels" ? "Finalizar  ✓" : "Siguiente  →"}
        </button>
      </div>
    </aside>
  );
}