import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
  uploading: boolean;
}

const CANVAS_SIZE = 256;
const CIRCLE_RADIUS = 112;

export function AvatarCropDialog({ open, imageSrc, onConfirm, onCancel, uploading }: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [baseScale, setBaseScale] = useState(1);

  // Load image when src changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Calculate base scale so the image covers the circle
      const coverSize = CIRCLE_RADIUS * 2;
      const scale = coverSize / Math.min(img.width, img.height);
      setBaseScale(scale);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
    return () => { setImgLoaded(false); };
  }, [imageSrc]);

  // Draw preview
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;
    const s = baseScale * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = cx - w / 2 + offset.x;
    const dy = cy - h / 2 + offset.y;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw dimmed background
    ctx.save();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.restore();

    // Full image dimmed
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(img, dx, dy, w, h);

    // Draw dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Cut out circle to show bright image
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, w, h);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [imgLoaded, zoom, offset, baseScale]);

  // Mouse/touch drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)));
  }, []);

  const handleConfirm = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const outputSize = 512;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = outputSize;
    cropCanvas.height = outputSize;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    const s = baseScale * zoom;
    const w = img.width * s;
    const h = img.height * s;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = cx - w / 2 + offset.x;
    const dy = cy - h / 2 + offset.y;

    // Map circle area to output
    const scale = outputSize / (CIRCLE_RADIUS * 2);
    const srcX = (cx - CIRCLE_RADIUS - dx) / s;
    const srcY = (cy - CIRCLE_RADIUS - dy) / s;
    const srcSize = (CIRCLE_RADIUS * 2) / s;

    // Draw circular crop
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outputSize, outputSize);

    cropCanvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png', 0.95);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Обрізати аватар</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-lg cursor-grab active:cursor-grabbing touch-none"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          />

          <div className="flex items-center gap-3 w-full px-2">
            <ZoomOut className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={4}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>

          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Скасувати
            </Button>
            <Button className="flex-1" onClick={handleConfirm} disabled={uploading}>
              {uploading ? 'Завантаження...' : 'Зберегти'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
