import type { Phase, ObjectKind, PlacedObject, LabelBox } from "../types";

type Props = {
  phase: Phase;
  outlineClosed: boolean;
  outlinePointCount: number;
  selectedObject: PlacedObject | null;
  selectedLabel: LabelBox | null;
  onUndo: () => void;
  onReset: () => void;
  onNextPhase: () => void;
  onStartDragTool: (kind: ObjectKind | "text") => void;
  onDeleteObject: (id: string) => void;
  onDeleteLabel: (id: string) => void;
  onFinish: () => void;
};

const SHAPES: { kind: ObjectKind; icon: string; label: string }[] = [
  { kind: "rect", icon: "□", label: "Rectángulo" },
  { kind: "circle", icon: "◯", label: "Círculo" },
  { kind: "line", icon: "—", label: "Línea" },
  { kind: "door", icon: "⌒", label: "Puerta" },
  { kind: "window", icon: "⊟", label: "Ventana" },
];

const PHASE_STEPS: { key: Phase; label: string; short: string }[] = [
  { key: "outline", label: "Contorno", short: "01" },
  { key: "elements", label: "Elementos", short: "02" },
];

const PHASE_HINTS: Record<Phase, string> = {
  outline: "Clic en la cuadrícula para añadir vértices. Cierra la forma sobre el primer punto.",
  elements: "Arrastra formas y texto al canvas. Doble clic en texto para editar.",
};

const ORDER: Record<Phase, number> = { outline: 0, elements: 1 };

export default function LeftSidebar({
  phase, outlineClosed, outlinePointCount,
  selectedObject, selectedLabel,
  onUndo, onReset, onNextPhase,
  onStartDragTool, onDeleteObject,
  onDeleteLabel,
  onFinish,
}: Props) {

  const nextEnabled = phase === "outline" ? outlineClosed : false;

  const handleDragStart = (e: React.DragEvent, kind: ObjectKind | "text") => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("tool", kind);
    const dragIcon = e.currentTarget.querySelector('.tool-icon');
    if (dragIcon) {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '24px monospace';
        ctx.fillStyle = '#3b82f6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dragIcon.textContent || '', 20, 20);
        e.dataTransfer.setDragImage(canvas, 20, 20);
      }
    }
    onStartDragTool(kind);
  };

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

        {/* ─── PHASE 1: OUTLINE ─── */}
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

        {/* ─── PHASE 2: ELEMENTS (formas + texto fusionados) ─── */}
        {phase === "elements" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Formas - draggable */}
            <div>
              <span className="section-label">Formas</span>
              <div className="tool-list">
                {SHAPES.map(s => (
                  <div
                    key={s.kind}
                    className="tool-btn draggable"
                    draggable
                    onDragStart={(e) => handleDragStart(e, s.kind)}
                  >
                    <span className="tool-icon">{s.icon}</span>
                    <span className="tool-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Texto - draggable */}
            <div>
              <span className="section-label">Texto</span>
              <div
                className="tool-btn draggable"
                draggable
                onDragStart={(e) => handleDragStart(e, "text")}
              >
                <span className="tool-icon" style={{ fontFamily: "serif", fontStyle: "italic" }}>Aa</span>
                <span className="tool-label">Añadir texto</span>
              </div>
            </div>

            {/* Inspector: Objeto seleccionado */}
            {selectedObject && (
              <div className="inspector-card">
                <div>
                  <div className="inspector-label">{selectedObject.label}</div>
                  <div className="inspector-sub">
                    {Math.round(selectedObject.width)} × {Math.round(selectedObject.height)} px
                  </div>
                </div>

                <button className="action-btn danger" onClick={() => onDeleteObject(selectedObject.id)}>
                  <span>✕</span> Eliminar
                </button>
              </div>
            )}

            {/* Inspector: Etiqueta seleccionada */}
            {selectedLabel && (
              <div className="inspector-card">
                <div className="inspector-label">Texto seleccionado</div>
                <button className="action-btn danger" onClick={() => onDeleteLabel(selectedLabel.id)}>
                  <span>✕</span> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        {phase === "outline" ? (
          <button
            className="action-btn primary"
            disabled={!nextEnabled}
            onClick={onNextPhase}
          >
            Siguiente  →
          </button>
        ) : (
          <button
            className="action-btn primary"
            onClick={onFinish}
          >
            Finalizar y generar 3D ✓
          </button>
        )}
      </div>
    </aside>
  );
}