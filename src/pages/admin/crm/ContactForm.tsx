import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const SENIORITY = ["c_level", "vp", "director", "manager", "senior", "staff", "entry"];
const CONTACT_TYPE = ["decision_maker", "influencer", "gatekeeper", "user", "champion"];
const LEAD_STATUS = ["new", "contacted", "qualified", "nurturing", "opportunity", "customer", "lost", "do_not_contact", "unresponsive"];
const SOURCE = ["manual", "wms_import", "apollo_search", "apollo_enrich", "csv_import", "website_signup", "referral", "trade_show", "inbound", "linkedin"];

type FormState = Record<string, any>;

const EMPTY: FormState = {
  full_name: "", first_name: "", last_name: "",
  email: "", secondary_email: "",
  phone: "", mobile: "", whatsapp: "", wechat: "", linkedin: "", personal_linkedin: "",
  job_title: "", department: "", seniority: "", contact_type: "", decision_level: "",
  lead_status: "new", lead_source: "", buyer_type: "", source: "manual",
  products_of_interest: [], company_id: null,
  country: "", city: "", state: "",
  notes: "", tags: [],
};

export default function ContactForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [productsInput, setProductsInput] = useState("");

  useEffect(() => {
    supabase.from("crm_companies").select("id,name").order("name").limit(1000).then(({ data }) => {
      setCompanies((data as any) ?? []);
    });
    if (!isNew) {
      supabase.from("crm_contacts").select("*").eq("id", id!).maybeSingle().then(({ data, error }) => {
        if (error) toast.error(error.message);
        if (data) {
          setForm({ ...EMPTY, ...data });
          setTagsInput(((data as any).tags ?? []).join(", "));
          setProductsInput(((data as any).products_of_interest ?? []).join(", "));
        }
        setLoading(false);
      });
    }
  }, [id, isNew]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload: any = { ...form };
    payload.tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    payload.products_of_interest = productsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (!payload.full_name?.trim()) {
      payload.full_name = `${payload.first_name ?? ""} ${payload.last_name ?? ""}`.trim() || payload.email || "Unnamed";
    }
    // strip non-column metadata
    delete payload.crm_companies;
    if (payload.company_id === "") payload.company_id = null;

    if (isNew) {
      const { error } = await supabase.from("crm_contacts").insert(payload);
      if (error) { setSaving(false); return toast.error(error.message); }
      toast.success("Contact created");
      navigate("/admin/prospect/people");
    } else {
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase.from("crm_contacts").update(payload).eq("id", id!);
      if (error) { setSaving(false); return toast.error(error.message); }
      toast.success("Contact saved");
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await supabase.from("crm_contacts").delete().eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    navigate("/admin/prospect/people");
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  const Field = ({ label, k, type = "text" }: { label: string; k: string; type?: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
    </div>
  );

  const Sel = ({ label, k, options }: { label: string; k: string; options: string[] }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={form[k] ?? ""} onValueChange={(v) => set(k, v)}>
        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/prospect/people")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold">{isNew ? "New Contact" : form.full_name || "Contact"}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          )}
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full Name" k="full_name" />
          <div />
          <Field label="First Name" k="first_name" />
          <Field label="Last Name" k="last_name" />
          <Field label="Email" k="email" type="email" />
          <Field label="Secondary Email" k="secondary_email" type="email" />
          <Field label="Phone" k="phone" />
          <Field label="Mobile" k="mobile" />
          <Field label="WhatsApp" k="whatsapp" />
          <Field label="WeChat" k="wechat" />
          <Field label="LinkedIn URL" k="linkedin" />
          <Field label="Personal LinkedIn" k="personal_linkedin" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Professional</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Job Title" k="job_title" />
          <Field label="Department" k="department" />
          <Sel label="Seniority" k="seniority" options={SENIORITY} />
          <Sel label="Contact Type" k="contact_type" options={CONTACT_TYPE} />
          <Field label="Decision Level" k="decision_level" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lead Info</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Sel label="Lead Status" k="lead_status" options={LEAD_STATUS} />
          <Sel label="Source" k="source" options={SOURCE} />
          <Field label="Lead Source" k="lead_source" />
          <Field label="Buyer Type" k="buyer_type" />
          <div className="md:col-span-2 space-y-1.5">
            <Label>Products of Interest (comma-separated)</Label>
            <Input value={productsInput} onChange={(e) => setProductsInput(e.target.value)} placeholder="beef, lamb, poultry" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Company</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={form.company_id ?? ""} onValueChange={(v) => set("company_id", v || null)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.company_id && (
            <Link to={`/admin/prospect/companies/${form.company_id}`} className="text-sm text-primary underline">
              Open company →
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Country" k="country" />
          <Field label="City" k="city" />
          <Field label="State" k="state" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes & Tags</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={5} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="vip, hot-lead" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}