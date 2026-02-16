import "./styles/home.css";

type Props = {
  onSelect: (mode: "draw" | "upload") => void;
};

export default function Home({ onSelect }: Props) {
  return (
    <div className="home-container">
      <h1 className="home-title">Gen2Home</h1>
      <p className="home-subtitle">Crea tu espacio en segundos</p>

      <div className="home-card-container">
        <div
          className="home-card"
          onClick={() => onSelect("draw")}
        >
          <h2>Dibuja tu plano</h2>
          <p>Crea tu plano desde cero usando formas simples</p>
        </div>

        <div
          className="home-card"
          onClick={() => onSelect("upload")}
        >
          <h2>Sube tu plano</h2>
          <p>Importa una imagen y genera el render 3D</p>
        </div>
      </div>
    </div>
  );
}
