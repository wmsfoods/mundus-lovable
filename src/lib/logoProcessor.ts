/**
 * Process a logo image: remove background, auto-crop, fit into a standard
 * square canvas with transparent padding. Pure client-side (Canvas API).
 *
 * Returns a PNG data URL. If anything fails (CORS, unsupported format), the
 * caller can fall back to the original image.
 */
export async function processLogo(
  input: string | File | Blob,
  options: { size?: number; tolerance?: number; padding?: number } = {}
): Promise<string> {
  const { size = 400, tolerance = 32, padding = 0.08 } = options;

  const img = await loadImage(input);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0);

  // Step 1: remove background
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  removeBackground(imageData, tolerance);
  ctx.putImageData(imageData, 0, 0);

  // Step 2: auto-crop to content bounds
  const bounds = getContentBounds(imageData);
  if (!bounds) return canvas.toDataURL("image/png");

  const cropW = bounds.right - bounds.left + 1;
  const cropH = bounds.bottom - bounds.top + 1;
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) throw new Error("Canvas not supported");
  cropCtx.drawImage(canvas, bounds.left, bounds.top, cropW, cropH, 0, 0, cropW, cropH);

  // Step 3: fit into a square with transparent padding (contain)
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas not supported");

  const pad = Math.round(size * padding);
  const avail = size - pad * 2;
  const scale = Math.min(avail / cropW, avail / cropH);
  const drawW = Math.round(cropW * scale);
  const drawH = Math.round(cropH * scale);
  const drawX = Math.round((size - drawW) / 2);
  const drawY = Math.round((size - drawH) / 2);

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(cropCanvas, 0, 0, cropW, cropH, drawX, drawY, drawW, drawH);

  return out.toDataURL("image/png");
}

/** Convert the processed data URL back to a Blob ready for upload. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

function loadImage(input: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));

    if (typeof input === "string") {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(input);
    }
  });
}

function removeBackground(imageData: ImageData, tolerance: number): void {
  const { data, width, height } = imageData;

  const samples = [
    px(data, 0, 0, width),
    px(data, width - 1, 0, width),
    px(data, 0, height - 1, width),
    px(data, width - 1, height - 1, width),
    px(data, Math.floor(width / 2), 0, width),
    px(data, 0, Math.floor(height / 2), width),
    px(data, width - 1, Math.floor(height / 2), width),
    px(data, Math.floor(width / 2), height - 1, width),
  ];
  const bg = avgColor(samples);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.sqrt(
      (r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2
    );
    if (dist < tolerance) {
      data[i + 3] = 0;
    } else if (dist < tolerance * 2) {
      // smooth edges
      data[i + 3] = Math.round(255 * ((dist - tolerance) / tolerance));
    }
  }
}

function px(data: Uint8ClampedArray, x: number, y: number, width: number) {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
}

function avgColor(colors: Array<{ r: number; g: number; b: number }>) {
  const acc = { r: 0, g: 0, b: 0 };
  for (const c of colors) { acc.r += c.r; acc.g += c.g; acc.b += c.b; }
  return {
    r: Math.round(acc.r / colors.length),
    g: Math.round(acc.g / colors.length),
    b: Math.round(acc.b / colors.length),
  };
}

function getContentBounds(imageData: ImageData) {
  const { data, width, height } = imageData;
  let top = height, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 10) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0 || right < 0) return null;
  return { top, bottom, left, right };
}

/** Checkerboard background style — useful to display transparent logos. */
export const transparencyCheckerboard =
  "repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 12px 12px";