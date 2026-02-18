import { useState } from "react";
import Home from "./Home";
import Draw from "./Draw";
import Upload from "./Upload";

function App() {
  const [mode, setMode] = useState<"home" | "draw" | "upload">("home");

  if (mode === "home") {
    return <Home onSelect={(m) => setMode(m)} />;
  }

  if (mode === "draw") {
    return <Draw />;
  }

  if (mode === "upload") {
    return <Upload />;
  }

  return null;
}

export default App;