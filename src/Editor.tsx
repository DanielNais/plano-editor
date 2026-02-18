import { useState, useRef, useEffect } from "react";
import { Stage, Layer, Image as KonvaImage, Line } from "react-konva";
import "./styles/editor.css";

type Props = {
  initialImageUrl: string;
  onBack: () => void;
};

type DrawLine = {
  tool: "pen" | "eraser";
  points: number[];
  color: string;
  width: number;
};

export default function Editor({ initialImageUrl, onBack }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [brushSize, setBrushSize] = useState(10);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const stageRef = useRef<any>(null);
  const canvasSize = { width: 1024, height: 512 }; // Equirectangular ratio 2:1

  // Load initial image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = initialImageUrl;
  }, [initialImageUrl]);

  // Drawing handlers
  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { 
      tool, 
      points: [pos.x, pos.y],
      color: tool === "pen" ? "#ff0000" : "#ffffff",
      width: brushSize,
    }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    setLines(lines.slice(0, -1).concat(lastLine));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Reference image upload
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona una imagen válida");
      return;
    }

    setReferenceFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => setReferencePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Clear annotations
  const handleClear = () => {
    setLines([]);
  };

  // Regenerate with annotations
  const handleRegenerate = async () => {
    if (!stageRef.current) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Export canvas as image (base image + drawings)
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const blob = await (await fetch(dataURL)).blob();

      const formData = new FormData();
      formData.append("imagen", blob, "anotada.png");
      if (referenceFile) {
        formData.append("referencia", referenceFile);
      }
      formData.append("prompt", prompt);

      // Para desarrollo local
      const response = await fetch("http://localhost:8000/generar.php", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar");
      }

      const data = await response.json();
      
      if (data.url || data.base64) {
        const newImageUrl = data.url || `data:image/jpeg;base64,${data.base64}`;
        
        // Load new image and reset
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setImage(img);
          setLines([]);
          setReferenceFile(null);
          setReferencePreview(null);
          setPrompt("");
        };
        img.src = newImageUrl;
      } else {
        throw new Error("Respuesta inválida del servidor");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="editor-page">
      {/* Left Panel - Tools */}
      <aside className="editor-sidebar">
        <div className="editor-header">
          <button className="btn-back" onClick={onBack}>← Atrás</button>
          <h2 className="editor-title">Editor 3D</h2>
        </div>

        <div className="editor-tools">
          <span className="section-label">Herramientas</span>
          
          <div className="tool-group">
            <button 
              className={`tool-btn ${tool === "pen" ? "active" : ""}`}
              onClick={() => setTool("pen")}
            >
              <span className="tool-icon">🖌</span>
              <span>Pincel</span>
            </button>
            <button 
              className={`tool-btn ${tool === "eraser" ? "active" : ""}`}
              onClick={() => setTool("eraser")}
            >
              <span className="tool-icon">🧹</span>
              <span>Borrador</span>
            </button>
          </div>

          <div className="slider-group">
            <label>
              <span>Grosor: {brushSize}px</span>
              <input
                type="range"
                min={5}
                max={20}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </label>
          </div>

          <button className="btn-clear" onClick={handleClear}>
            Limpiar anotaciones
          </button>
        </div>

        <div className="editor-reference">
          <span className="section-label">Imagen de referencia</span>
          
          {!referencePreview ? (
            <label className="reference-upload">
              <input
                type="file"
                accept="image/*"
                onChange={handleReferenceUpload}
                style={{ display: "none" }}
              />
              <div className="reference-placeholder">
                <span className="reference-icon">🖼</span>
                <span>Subir referencia</span>
              </div>
            </label>
          ) : (
            <div className="reference-preview-wrapper">
              <img src={referencePreview} alt="Referencia" className="reference-preview" />
              <button 
                className="reference-remove"
                onClick={() => {
                  setReferenceFile(null);
                  setReferencePreview(null);
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="editor-prompt">
          <span className="section-label">Instrucciones</span>
          <textarea
            className="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Pon estos azulejos en el área marcada en rojo..."
            rows={4}
          />
        </div>

        {error && (
          <div className="editor-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <button
          className="btn-regenerate"
          onClick={handleRegenerate}
          disabled={isProcessing || !prompt.trim()}
        >
          {isProcessing ? (
            <>
              <span className="spinner" />
              Generando...
            </>
          ) : (
            "🚀 Regenerar"
          )}
        </button>
      </aside>

      {/* Main Canvas Area */}
      <main className="editor-canvas-area">
        <div className="editor-canvas-wrapper">
          {image && (
            <Stage
              ref={stageRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              style={{ cursor: tool === "pen" ? "crosshair" : "pointer" }}
            >
              <Layer>
                {/* Background equirectangular image */}
                <KonvaImage
                  image={image}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
                
                {/* Drawn annotations */}
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.color}
                    strokeWidth={line.width}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === "eraser" ? "destination-out" : "source-over"
                    }
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>
        
        <div className="editor-hint">
          {tool === "pen" 
            ? "🖌 Dibuja en rojo sobre las áreas que quieres modificar"
            : "🧹 Borra las anotaciones que no necesites"
          }
        </div>
      </main>
    </div>
  );
}