/**
 * Client-side image optimization helpers.
 *
 * - `compressImage`: resizes (longest side) and re-encodes to WebP before upload.
 *   Typical 3–5 MB phone photo → ~60–150 KB.
 * - `transformedPublicUrl`: appends Supabase image-transform query params so
 *   we serve the right size/quality per render context (card vs modal).
 */

export interface CompressOptions {
  maxSize?: number;      // longest side in px (default 1280)
  quality?: number;      // 0..1 (default 0.82)
  mimeType?: string;     // output (default image/webp)
}

export async function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const { maxSize = 1280, quality = 0.82, mimeType = "image/webp" } = opts;

  if (!file.type.startsWith("image/")) return file;
  // Skip already-tiny files or formats we shouldn't touch (svg, gif animations).
  if (file.size < 80 * 1024) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;

  const bitmap = await loadBitmap(file);
  const { width, height } = fitInto(bitmap.width, bitmap.height, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
  if (!blob) return file;
  // If compression actually made it bigger (rare), keep original.
  if (blob.size >= file.size) return file;

  const ext = mimeType === "image/webp" ? "webp" : mimeType.split("/")[1] || "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: mimeType, lastModified: Date.now() });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Revoke later — the bitmap path needs the URL alive until drawImage runs;
    // for the <img> branch, decode() already resolved so we can revoke now.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function fitInto(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w >= h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/**
 * Returns the same URL with Supabase image-transform query params.
 * Works on public bucket URLs of the form `.../object/public/<bucket>/<path>`.
 * If we can rewrite to the render endpoint we do; otherwise we just append
 * width/quality so any future CDN can pick them up.
 */
export function transformedPublicUrl(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" } = {},
): string {
  if (!url) return "";
  const { width, height, quality = 75, resize = "cover" } = opts;

  try {
    const u = new URL(url);
    // Drop our legacy `?v=timestamp` cache-buster — long cache is preferred.
    u.search = "";
    // Rewrite /object/public/ → /render/image/public/ when possible.
    u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    if (width) u.searchParams.set("width", String(width));
    if (height) u.searchParams.set("height", String(height));
    u.searchParams.set("quality", String(quality));
    u.searchParams.set("resize", resize);
    return u.toString();
  } catch {
    return url;
  }
}