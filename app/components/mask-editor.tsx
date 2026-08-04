"use client";

import { Eraser, Paintbrush } from "lucide-react";
import { PointerEvent, useEffect, useRef, useState } from "react";

export function MaskEditor({
  imageUrl,
  onMaskChange,
}: {
  imageUrl: string;
  onMaskChange: (mask: Blob | null) => void;
}) {
  const imageCanvas = useRef<HTMLCanvasElement>(null);
  const maskCanvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{x: number; y: number} | null>(null);
  const [brush, setBrush] = useState(48);
  const [hasMask, setHasMask] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      for (const canvas of [imageCanvas.current, maskCanvas.current]) {
        if (!canvas) continue;
        canvas.width = width;
        canvas.height = height;
      }
      imageCanvas.current?.getContext("2d")?.drawImage(image, 0, 0, width, height);
      const context = maskCanvas.current?.getContext("2d");
      if (context) context.clearRect(0, 0, width, height);
      setHasMask(false);
      onMaskChange(null);
    };
    image.src = imageUrl;
  }, [imageUrl, onMaskChange]);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = maskCanvas.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * canvas.width, y: ((event.clientY - rect.top) / rect.height) * canvas.height };
  }

  function paint(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = maskCanvas.current;
    const position = point(event);
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !position) return;
    context.fillStyle = "white";
    if (lastPos.current) {
      context.beginPath();
      context.moveTo(lastPos.current.x, lastPos.current.y);
      context.lineTo(position.x, position.y);
      context.lineWidth = brush;
      context.lineCap = "round";
      context.strokeStyle = "white";
      context.stroke();
    } else {
      context.beginPath();
      context.arc(position.x, position.y, brush / 2, 0, Math.PI * 2);
      context.fill();
    }
    lastPos.current = position;
    setHasMask(true);
  }

  function finish() {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    const overlay = maskCanvas.current;
    if (!overlay) return;
    // Output mask: transparent where user painted (edit area), opaque elsewhere (keep area)
    const output = document.createElement("canvas");
    output.width = overlay.width;
    output.height = overlay.height;
    const ctx = output.getContext("2d");
    if (!ctx) return;
    // Fill with opaque white (keep everything)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, output.width, output.height);
    // Erase painted areas to transparent (edit these areas)
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(overlay, 0, 0);
    output.toBlob((blob) => onMaskChange(blob), "image/png");
  }

  function clear() {
    const canvas = maskCanvas.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasMask(false);
    onMaskChange(null);
  }

  return (
    <div className="mask-editor">
      <div className="mask-toolbar">
        <span><Paintbrush size={16} /> 涂白要修改的区域</span>
        <label>笔刷 <input type="range" min="16" max="120" value={brush} onChange={(event) => setBrush(Number(event.target.value))} /></label>
        <button type="button" onClick={clear}><Eraser size={15} /> 清空</button>
      </div>
      <div className="mask-stage">
        <canvas ref={imageCanvas} />
        <canvas
          ref={maskCanvas}
          className={hasMask ? "has-mask" : ""}
          onPointerDown={(event) => { drawing.current = true; lastPos.current = null; event.currentTarget.setPointerCapture(event.pointerId); paint(event); }}
          onPointerMove={paint}
          onPointerUp={finish}
          onPointerCancel={finish}
        />
      </div>
      <small>涂白的区域会被重新生成，未涂区域保持不变。</small>
    </div>
  );
}
