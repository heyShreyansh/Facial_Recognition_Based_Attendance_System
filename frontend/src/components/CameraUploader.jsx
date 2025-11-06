import React, { useRef, useState, useEffect } from "react";

/**
 * CameraUploader
 * - Captures webcam frames with getUserMedia
 * - Posts a frame every `intervalMs` to the backend `apiUrl`
 * - Shows last JSON result
 *
 * Usage:
 * <CameraUploader apiUrl="http://localhost:5000/api/recognize" intervalMs={2000} />
 */
export default function CameraUploader({ apiUrl = "/api/recognize", intervalMs = 2000 }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
      intervalRef.current = setInterval(captureAndSend, intervalMs);
    } catch (err) {
      alert("Could not access camera: " + (err.message || err));
    }
  }

  function stopCamera() {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    }
  }

  async function captureAndSend() {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    const w = videoRef.current.videoWidth || 640;
    const h = videoRef.current.videoHeight || 480;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    canvasRef.current.width = w;
    canvasRef.current.height = h;
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, "image/jpeg", 0.8));
    if (!blob) return;
    try {
      const form = new FormData();
      form.append("file", blob, "frame.jpg");
      const res = await fetch(apiUrl, { method: "POST", body: form });
      if (!res.ok) {
        console.error("Server returned error:", res.statusText);
        return;
      }
      const json = await res.json();
      setLastResult(json);
    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {!running ? (
          <button onClick={startCamera}>Start Detector</button>
        ) : (
          <button onClick={stopCamera}>Stop Detector</button>
        )}
      </div>

      <div>
        <video ref={videoRef} style={{ width: 480, maxWidth: "100%" }} autoPlay muted playsInline />
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Last result:</strong>
        <pre style={{ background: "#f6f6f6", padding: 8, borderRadius: 4 }}>
          {lastResult ? JSON.stringify(lastResult, null, 2) : "No result yet"}
        </pre>
      </div>
    </div>
  );
}
