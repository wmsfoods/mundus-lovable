import { useState, useRef } from "react";
import { Camera, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScannedCardData {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  linkedin?: string | null;
  fax?: string | null;
}

interface Props {
  onScanned: (data: ScannedCardData) => void;
  label?: string;
  hint?: string;
  /** Render as a full CTA banner (default) or just the button */
  variant?: "banner" | "inline";
}

export function ScanCardButton({ onScanned, label, hint, variant = "banner" }: Props) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCapture = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setScanning(true);
    setShowModal(true);

    try {
      const buffer = await file.arrayBuffer();
      // Chunked base64 to avoid call-stack overflow on large images
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("scan-business-card", {
        body: { image: base64, mediaType: file.type },
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || "Scan failed");
      }

      toast.success("Card scanned — please review fields");
      onScanned(data.data || {});
      setShowModal(false);
      setPreview(null);
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message || e}`);
    } finally {
      setScanning(false);
    }
  };

  const button = (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      disabled={scanning}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
        border: "1px dashed #8B2252", color: "#8B2252", background: "#FDF2F8",
        cursor: scanning ? "wait" : "pointer", whiteSpace: "nowrap",
      }}
    >
      {scanning ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
      {scanning ? "Scanning…" : (label || "📷 Scan Card")}
    </button>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCapture(file);
          e.target.value = "";
        }}
      />

      {variant === "banner" ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          padding: "10px 14px", background: "#FDF2F8", borderRadius: 12,
          border: "1px dashed #E8B4CB", marginBottom: 8,
        }}>
          {button}
          <span style={{ fontSize: 12, color: "#6B7280", flex: 1, minWidth: 160 }}>
            {hint || "Take a photo of a business card to auto-fill the fields below."}
          </span>
        </div>
      ) : button}

      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={() => { if (!scanning) { setShowModal(false); setPreview(null); } }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", textAlign: "center" }}
          >
            {preview && (
              <img
                src={preview}
                alt="Card preview"
                style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 12, marginBottom: 16, border: "1px solid #E5E7EB" }}
              />
            )}
            {scanning ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <Loader2 size={32} className="animate-spin" style={{ color: "#8B2252" }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Reading business card…</p>
                <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>AI is extracting contact information</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "1px solid #D1D5DB", background: "white", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <RotateCcw size={14} /> Retry
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setPreview(null); }}
                  style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, border: "none", background: "#F3F4F6", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}