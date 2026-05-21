import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface Props {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  busy?: boolean;
}

const OUTPUT_SIZE = 512;

export default function AvatarCropModal({ open, imageSrc, onCancel, onConfirm, busy }: Props) {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation, OUTPUT_SIZE);
    if (blob) await onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("profile.avatar.cropTitle", { defaultValue: "Adjust your photo" })}</DialogTitle>
        </DialogHeader>

        <div style={{ position: "relative", width: "100%", height: 320, background: "#0f0f0f", borderRadius: 12, overflow: "hidden" }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ZoomOut size={16} className="text-muted-foreground" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={(v) => setZoom(v[0] ?? 1)}
              style={{ flex: 1 }}
            />
            <ZoomIn size={16} className="text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
              fontSize: 13, padding: "6px 10px", borderRadius: 8,
              background: "transparent", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))",
              cursor: "pointer",
            }}
          >
            <RotateCw size={14} /> {t("profile.avatar.rotate", { defaultValue: "Rotate" })}
          </button>
        </div>

        <DialogFooter style={{ marginTop: 12, gap: 8 }}>
          <button type="button" className="crm-btn-outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="button" className="crm-btn-primary" onClick={handleConfirm} disabled={busy || !croppedAreaPixels}>
            {busy
              ? t("profile.avatar.saving", { defaultValue: "Saving..." })
              : t("profile.avatar.save", { defaultValue: "Save photo" })}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

async function getCroppedBlob(
  src: string,
  area: Area,
  rotation: number,
  outputSize: number,
): Promise<Blob | null> {
  const image = await loadImage(src);
  const rad = (rotation * Math.PI) / 180;

  // First draw rotated image into an offscreen canvas big enough to contain it.
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bWidth = image.width * cos + image.height * sin;
  const bHeight = image.width * sin + image.height * cos;

  const off = document.createElement("canvas");
  off.width = bWidth;
  off.height = bHeight;
  const offCtx = off.getContext("2d");
  if (!offCtx) return null;
  offCtx.translate(bWidth / 2, bHeight / 2);
  offCtx.rotate(rad);
  offCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Now crop the rotated canvas using react-easy-crop's pixel area.
  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = outputSize;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    off,
    area.x, area.y, area.width, area.height,
    0, 0, outputSize, outputSize,
  );

  return await new Promise<Blob | null>((resolve) =>
    out.toBlob((b) => resolve(b), "image/webp", 0.9),
  );
}