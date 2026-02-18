import "./styles/home.css";

type Props = {
  onSelect: (mode: "draw" | "upload") => void;
};

export default function Home({ onSelect }: Props) {
  return (
    <div className="home-container">
      <div className="home-inner">
        <div className="home-logo-mark">⌖</div>
        <h1 className="home-title">Plan<span>Editor</span></h1>
        <p className="home-subtitle">Diseña tu espacio con precisión · Exports en 3D próximamente</p>

        <div className="home-card-container">
          <div className="home-card" onClick={() => onSelect("draw")}>
            <span className="home-card-icon">✏️</span>
            <h2>Dibuja tu plano</h2>
            <p>Traza el contorno de tu habitación, coloca elementos y añade anotaciones.</p>
            <span className="home-card-badge">Disponible</span>
          </div>

          <div className="home-card" onClick={() => onSelect("upload")}>
            <span className="home-card-icon">📐</span>
            <h2>Sube tu plano</h2>
            <p>Importa una imagen existente y genera el render 3D automáticamente.</p>
            <span className="home-card-badge">Disponible</span>
          </div>
        </div>
      </div>

      <div className="home-version">PlanEditor v0.1 · Beta</div>
    </div>
  );
}