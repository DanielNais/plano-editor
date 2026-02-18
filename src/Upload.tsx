import { useState } from "react";
import "./styles/upload.css";

export default function Upload() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar que sea imagen
        if (!file.type.startsWith("image/")) {
            setError("Por favor selecciona una imagen válida");
            return;
        }

        setSelectedFile(file);
        setError(null);
        setResultUrl(null);

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleProcess = async () => {
        if (!selectedFile) return;

        setIsProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("imagen", selectedFile);

            // IMPORTANTE: Cambia esta URL a tu endpoint PHP real
            const response = await fetch("/api/generar.php", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Error al procesar la imagen");
            }

            const data = await response.json();

            // Asume que PHP devuelve { url: "..." } o { base64: "..." }
            if (data.url) {
                setResultUrl(data.url);
            } else if (data.base64) {
                setResultUrl(`data:image/jpeg;base64,${data.base64}`);
            } else {
                throw new Error("Respuesta inválida del servidor");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResultUrl(null);
        setError(null);
    };

    return (
        <div className="upload-page">
            <div className="upload-container">
                {/* Header */}
                <div className="upload-header">
                    <div className="app-logo-mark">⌖</div>
                    <h1 className="upload-title">Sube tu plano</h1>
                    <p className="upload-subtitle">
                        Carga una imagen de tu plano arquitectónico y genera una vista 3D equirectangular
                    </p>
                </div>

                {/* Upload Area */}
                {!resultUrl && (
                    <div className="upload-content">
                        {!previewUrl ? (
                            <label className="upload-dropzone">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />
                                <div className="upload-icon">📐</div>
                                <div className="upload-text">
                                    <strong>Haz clic para seleccionar</strong> o arrastra tu imagen aquí
                                </div>
                                <div className="upload-hint">PNG, JPG, WEBP hasta 10MB</div>
                            </label>
                        ) : (
                            <div className="upload-preview-container">
                                <img src={previewUrl} alt="Preview" className="upload-preview" />
                                <div className="upload-actions">
                                    <button
                                        className="btn-primary"
                                        onClick={handleProcess}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <span className="spinner" />
                                                Procesando...
                                            </>
                                        ) : (
                                            "🚀 Generar vista 3D"
                                        )}
                                    </button>
                                    <button className="btn-secondary" onClick={handleReset}>
                                        Cambiar imagen
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="upload-error">
                                <span>⚠️</span> {error}
                            </div>
                        )}
                    </div>
                )}

                {/* Result */}
                {resultUrl && (
                    <div className="upload-result">
                        <h2 className="result-title">✨ Vista 3D generada</h2>
                        <img src={resultUrl} alt="Resultado 3D" className="result-image" />
                        <div className="result-actions">
                            <a href={resultUrl} download="plano-3d.jpg" className="btn-primary">
                                ⬇ Descargar
                            </a>
                            <button className="btn-secondary" onClick={handleReset}>
                                Subir otro plano
                            </button>
                        </div>
                    </div>
                )}

                {/* Back link */}
                <a href="/" className="upload-back">← Volver al inicio</a>
            </div>
        </div>
    );
}