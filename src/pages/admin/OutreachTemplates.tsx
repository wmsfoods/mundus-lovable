import "@/styles/mundus-outreach.css";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Tpl = { id: string; name: string; category: string; language: string; subject: string; body_html: string };

export default function OutreachTemplates() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [preview, setPreview] = useState<Tpl | null>(null);
  useEffect(() => {
    supabase.from("outreach_templates").select("id,name,category,language,subject,body_html").order("created_at", { ascending: false })
      .then(({ data }) => setTpls((data as Tpl[]) ?? []));
  }, []);
  return (
    <div className="out-page">
      <div>
        <h1 className="out-h1">Email Templates</h1>
        <p className="out-sub">Templates available for outreach campaigns</p>
      </div>
      <div className="out-tpl-grid">
        {tpls.map((t) => (
          <div key={t.id} className="out-tpl-card">
            <div className="out-tpl-name">{t.name}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="out-badge cat">{t.category}</span>
              <span className="out-badge lang">{t.language.toUpperCase()}</span>
            </div>
            <div className="out-tpl-subj">Subject: {t.subject}</div>
            <div className="out-tpl-actions">
              <Button size="sm" variant="outline" onClick={() => setPreview(t)}>Preview</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.info("Editor coming soon")}>Edit</Button>
            </div>
          </div>
        ))}
        {tpls.length === 0 && <div className="out-sub">No templates yet.</div>}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <iframe title="preview" srcDoc={preview.body_html} style={{ width: "100%", height: 600, border: "1px solid hsl(var(--border))", borderRadius: 8, background: "#fff" }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}