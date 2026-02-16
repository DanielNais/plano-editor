import { useState } from "react";
import Home from "./Home";
import Draw from "./Draw";


function App() {
  const [mode, setMode] = useState<"home" | "draw" | "upload">("home");

  if (mode === "home") {
    return <Home onSelect={(m) => setMode(m)} />;
  }

  if (mode === "draw") {
    return <Draw />;
  }

  if (mode === "upload") {
    return <div>Subida de plano (próximamente)</div>;
  }

  return null;
}

export default App;
