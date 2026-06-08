import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History, RotateCcw, Save, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useTemplateDefinition,
  useTemplateVersions,
  saveTemplateVersion,
  setActiveVersion,
  type Locale,
  type EditableField,
} from "@/hooks/useEmailTemplateEditor";
import { renderWelcomeFromOverrides } from "@/lib/email/welcomeRender";
import { emailTemplates, type EmailTemplateName, type TemplateLayoutOverrides } from "@/lib/emailTemplates";
import { renderTemplate } from "@/lib/email/templateEngine";
import { supabase } from "@/integrations/supabase/client";

function renderPreview(templateKey: string, values: Record<string, string>, samples: Record<string, string>) {
  if (templateKey === "welcome") {
    return renderWelcomeFromOverrides(values as any, {
      name: samples.name || "Maria Silva",
      company: samples.company || "Friboi Exports",
      email: samples.email || "maria@friboi.com",
      role: samples.role || "Supplier",
      country: samples.country || "Brazil",
      countryFlag: samples.countryFlag || "🇧🇷",
    }).html;
  }
  const fn = (emailTemplates as any)[templateKey] as ((v: any, o?: TemplateLayoutOverrides) => string) | undefined;
  if (!fn) return `<p style="padding:32px;font-family:Arial">Template "${templateKey}" não encontrado.</p>`;
  const interp = (s?: string) => (s ? renderTemplate(s, samples) : undefined);
  const overrides: TemplateLayoutOverrides = {
    heroTitle: interp(values.heroTitle),
    preheader: interp(values.preheader),
    ctaLabel: interp(values.ctaLabel),
    ctaUrl: interp(values.ctaUrl),
    primaryColor: values.primaryColor || undefined,
    logoUrl: values.logoUrl || undefined,
  };
  // Build a vars object with sample values + a few common numeric coercions.
  const vars: Record<string, any> = { ...samples };
  ["round", "maxRounds", "rounds", "hours", "statusStep", "activeOffers", "newBids", "activeNegos", "dealsClosed"].forEach((k) => {
    if (k in vars) vars[k] = Number(vars[k]) || 1;
  });
  if ("isLastRound" in vars) vars.isLastRound = false;
  if ("acceptedBy" in vars) vars.acceptedBy = vars.acceptedBy || "buyer";
  if ("topOffers" in vars) vars.topOffers = [];
  try {
    return fn(vars, overrides);
  } catch (e: any) {
    return `<p style="padding:32px;font-family:Arial;color:#DC2626">Erro ao renderizar preview: ${e.message}</p>`;
  }
}

export default function EmailTemplateEditor() {
  const { templateKey = "welcome" } = useParams();
  const navigate = useNavigate();
  const { definition, loading } = useTemplateDefinition(templateKey);
  const [locale, setLocale] = useState<Locale>("pt");
  const { versions, activeId, refresh } = useTemplateVersions(templateKey, locale);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const focusedFieldRef = useRef<string | null>(null);

  // Load active version (or defaults) when locale/definition changes
  useEffect(() => {
    if (!definition) return;
    const active = versions.find((v) => v.id === activeId);
    const defaults = locale === "pt" ? definition.defaults_pt : definition.defaults_en;
    setValues(active?.values || defaults || {});
  }, [definition, versions, activeId, locale]);

  const samples = useMemo(() => {
    const m: Record<string, string> = {};
    definition?.variables.forEach((v) => { m[v.key] = v.sample; });
    return m;
  }, [definition]);

  const previewHtml = useMemo(
    () => (definition ? renderPreview(definition.template_key, values, samples) : ""),
    [definition, values, samples],
  );

  if (loading) return <div style={{ padding: 32 }}>Carregando…</div>;
  if (!definition) return <div style={{ padding: 32 }}>Template não encontrado.</div>;

  const setField = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const insertVariable = (vk: string) => {
    const fk = focusedFieldRef.current;
    if (!fk) {
      toast.info("Clique em um campo de texto antes de inserir a variável.");
      return;
    }
    setValues((s) => ({ ...s, [fk]: (s[fk] || "") + `{{${vk}}}` }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await saveTemplateVersion({ templateKey: definition.template_key, locale, values });
    setSaving(false);
    if ("error" in res) {
      toast.error("Falha ao salvar: " + res.error);
    } else {
      toast.success(`Versão ${res.version_number} salva e ativada.`);
      refresh();
    }
  };

  const restoreDefaults = () => {
    const d = locale === "pt" ? definition.defaults_pt : definition.defaults_en;
    setValues({ ...d });
    toast.info("Valores resetados para o padrão de fábrica (lembre de salvar).");
  };

  const revertTo = async (versionId: string) => {
    await setActiveVersion(definition.template_key, locale, versionId);
    toast.success("Versão ativa atualizada.");
    refresh();
    setShowHistory(false);
  };

  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const handleSendTest = async () => {
    const to = testEmail.trim();
    if (!to) { toast.error("Informe um email de destino"); return; }
    setSendingTest(true);
    try {
      const subject = `[TEST] ${renderTemplate(values.subject || definition.name_en, samples)}`;
      const html = previewHtml;
      const { data: newId, error } = await (supabase as any).rpc("enqueue_email", {
        p_to_email: to,
        p_subject: subject,
        p_html_body: html,
        p_template_name: `${definition.template_key}__test`,
        p_template_vars: { _test: true, locale, values },
      });
      if (error) throw error;
      if (newId) await supabase.functions.invoke("send-email", { body: { email_id: newId } });
      toast.success(`Teste enviado para ${to}`);
    } catch (e: any) {
      toast.error("Falha ao enviar teste: " + (e?.message || e));
    } finally {
      setSendingTest(false);
    }
  };

  const name = locale === "pt" ? definition.name_pt : definition.name_en;
  const description = locale === "pt" ? definition.description_pt : definition.description_en;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F8FAFC" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #E5E7EB", background: "#fff" }}>
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/docs")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{name}</div>
          <div style={{ fontSize: 12, color: "#6B7280" }}>{description}</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 8, padding: 4 }}>
          {(["pt", "en"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                background: locale === l ? "#fff" : "transparent",
                color: locale === l ? "#0F172A" : "#6B7280",
                fontWeight: 600, fontSize: 13,
                boxShadow: locale === l ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >{l.toUpperCase()}</button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHistory((s) => !s)}>
          <History className="w-4 h-4 mr-1" /> Histórico ({versions.length})
        </Button>
        <Button variant="outline" size="sm" onClick={restoreDefaults}>
          <RotateCcw className="w-4 h-4 mr-1" /> Padrão
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando…" : "Salvar nova versão"}
        </Button>
      </div>

      {/* Body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 280px", gap: 0, flex: 1, minHeight: 0 }}>
        {/* Form */}
        <div style={{ overflow: "auto", padding: 20, borderRight: "1px solid #E5E7EB", background: "#fff" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8B2252", letterSpacing: 0.6, marginBottom: 12 }}>
            CAMPOS EDITÁVEIS · {locale.toUpperCase()}
          </div>
          {definition.editable_fields.map((f) => (
            <FieldEditor
              key={f.key}
              field={f}
              value={values[f.key] || ""}
              onChange={(v) => setField(f.key, v)}
              onFocus={() => { focusedFieldRef.current = f.key; }}
            />
          ))}
        </div>

        {/* Preview */}
        <div style={{ display: "flex", flexDirection: "column", background: "#F1F5F9", minHeight: 0 }}>
          <div style={{ padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: 0.6, borderBottom: "1px solid #E5E7EB", background: "#fff" }}>
            PREVIEW · ASSUNTO: <span style={{ color: "#0F172A", fontWeight: 600 }}>{values.subject || "(sem assunto)"}</span>
          </div>
          <iframe
            title="Preview do email"
            srcDoc={previewHtml}
            style={{ flex: 1, width: "100%", border: "none", background: "#fff" }}
          />
        </div>

        {/* Variables panel or History */}
        <div style={{ overflow: "auto", padding: 16, borderLeft: "1px solid #E5E7EB", background: "#fff" }}>
          {showHistory ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B2252", letterSpacing: 0.6, marginBottom: 12 }}>
                HISTÓRICO DE VERSÕES
              </div>
              {versions.length === 0 && <div style={{ fontSize: 13, color: "#6B7280" }}>Nenhuma versão salva ainda.</div>}
              {versions.map((v) => (
                <div key={v.id} style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 10, marginBottom: 8, background: v.id === activeId ? "#FDF2F7" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                    <span>v{v.version_number} {v.id === activeId && <span style={{ color: "#8B2252", fontSize: 11 }}>· ATIVA</span>}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {new Date(v.created_at).toLocaleString("pt-BR")}
                  </div>
                  {v.id !== activeId && (
                    <Button variant="outline" size="sm" style={{ marginTop: 6 }} onClick={() => revertTo(v.id)}>
                      Tornar ativa
                    </Button>
                  )}
                  {v.id === activeId && (
                    <Button variant="ghost" size="sm" style={{ marginTop: 6 }} onClick={() => setValues(v.values)}>
                      Carregar no editor
                    </Button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B2252", letterSpacing: 0.6, marginBottom: 4 }}>
                VARIÁVEIS DISPONÍVEIS
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12 }}>
                Clique para inserir no campo selecionado.
              </div>
              {definition.variables.map((v) => (
                <button
                  key={v.key}
                  onClick={() => insertVariable(v.key)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "8px 10px",
                    border: "1px solid #E5E7EB", borderRadius: 6, marginBottom: 6,
                    background: "#F9FAFB", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <code style={{ fontSize: 12, color: "#8B2252", fontWeight: 600 }}>{`{{${v.key}}}`}</code>
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", marginTop: 1 }}>ex: {v.sample}</div>
                </button>
              ))}
              <div style={{ marginTop: 16, padding: 10, background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#065F46", marginBottom: 6 }}>
                  <SendHorizonal className="inline w-3 h-3 mr-1" /> ENVIAR TESTE
                </div>
                <Input
                  type="email"
                  placeholder="email@destino.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  style={{ marginBottom: 6, fontSize: 12 }}
                />
                <Button size="sm" onClick={handleSendTest} disabled={sendingTest} style={{ width: "100%" }}>
                  {sendingTest ? "Enviando…" : "Enviar para este email"}
                </Button>
                <div style={{ fontSize: 10, color: "#065F46", marginTop: 6, lineHeight: 1.4 }}>
                  Usa os valores atuais do editor (sem precisar salvar).
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldEditor({ field, value, onChange, onFocus }: {
  field: EditableField;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
        {field.label}
        {field.maxLength && <span style={{ color: "#9CA3AF", fontWeight: 400, marginLeft: 6 }}>· {value.length}/{field.maxLength}</span>}
      </Label>
      {field.type === "textarea" && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          maxLength={field.maxLength}
          rows={3}
        />
      )}
      {field.type === "color" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={value || "#8B2252"}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 44, height: 36, border: "1px solid #E5E7EB", borderRadius: 6, padding: 2, background: "#fff" }}
          />
          <Input value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} placeholder="#8B2252" />
        </div>
      )}
      {field.type === "image" && (
        <div>
          <Input value={value} onChange={(e) => onChange(e.target.value)} onFocus={onFocus} placeholder="https://…/logo.png" />
          {value && (
            <img src={value} alt="" style={{ marginTop: 6, maxHeight: 48, borderRadius: 4, border: "1px solid #E5E7EB", padding: 4, background: "#fff" }} />
          )}
        </div>
      )}
      {(field.type === "text" || field.type === "cta") && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          maxLength={field.maxLength}
        />
      )}
    </div>
  );
}