import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { processLogo, dataUrlToBlob, transparencyCheckerboard } from "@/lib/logoProcessor";

/**
 * Logo upload + auto-process control used inside company creation modals.
 * - Accepts a file or a pasted URL.
 * - Runs background removal + auto-crop + square fit on the client.
 * - Uploads the processed PNG to the `avatars` bucket and surfaces the
 *   public URL via `onChange`.
 */
export function LogoUploader({
  value,
  onChange,
  folder = "new",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [urlInput, setUrlInput] = useState(value || "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) { setPreview(null); setUrlInput(""); }
  }, [value]);

  const uploadProcessed = async (dataUrl: string) => {
    const blob = await dataUrlToBlob(dataUrl);
    const path = `companies/${folder}/logo-${Date.now()}.png`;
    const { error } = await supabase.storage.from("avatars").upload(path, blob, {
      contentType: "image/png", upsert: true, cacheControl: "3600",
    });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const processed = await processLogo(file, { size: 400 });
      setPreview(processed);
      await uploadProcessed(processed);
    } catch (e) {
      console.error("Logo processing failed", e);
      // fallback: upload original
      try {
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const path = `companies/${folder}/logo-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, {
          contentType: file.type, upsert: true, cacheControl: "3600",
        });
        if (error) throw error;
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        onChange(data.publicUrl);
        setPreview(data.publicUrl);
      } catch {/* swallow */}
    } finally {
      setBusy(false);
    }
  };

  const handleUrl = async () => {
    const url = urlInput.trim();
    if (!url) { onChange(""); setPreview(null); return; }
    if (!/^https?:\/\//i.test(url)) return;
    setBusy(true);
    try {
      const processed = await processLogo(url, { size: 400 });
      setPreview(processed);
      await uploadProcessed(processed);
    } catch {
      // CORS or other failure → store the URL as-is
      onChange(url);
      setPreview(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Company Logo</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          onClick={() => fileRef.current?.click()}
          title="Upload logo"
          style={{
            width: 84, height: 84, borderRadius: 14,
            border: "2px dashed #D1D5DB",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", background: transparencyCheckerboard,
            cursor: "pointer", flexShrink: 0, position: "relative",
          }}
        >
          {busy ? (
            <span style={{ fontSize: 10, color: "#6B7280" }}>Processing…</span>
          ) : preview ? (
            <img src={preview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 26 }}>🏢</span>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <label
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, border: "1px solid #D1D5DB",
              background: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "fit-content",
            }}
          >
            📁 Upload file
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
            />
          </label>
          <input
            placeholder="or paste logo URL…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={() => void handleUrl()}
            style={{
              fontSize: 12, padding: "7px 10px", borderRadius: 6,
              border: "1px solid #D1D5DB", outline: "none", width: "100%",
            }}
          />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>
        Background auto-removed and fit to a standard square. PNG with transparency.
      </p>
    </div>
  );
}