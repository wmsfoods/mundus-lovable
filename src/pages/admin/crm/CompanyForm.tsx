import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const COMPANY_TYPE = ["prospect", "buyer", "supplier", "customer", "partner"];
const STAGE = ["cold", "warm", "hot", "engaged", "qualified", "customer", "lost"];
const STATUS = ["active", "inactive", "archived"];

const EMPTY: Record<string, any> = {
  name: "", trade_name: "", domain: "", tax_id: "",
  company_type: "prospect", industry: "", stage: "cold", status: "active",
  country: "", city: "", state: "", address: "", postal_code: "",
  phone: "", website: "", linkedin_url: "",
  company_size: "", estimated_employees: null, annual_revenue: null, founded_year: null,
  notes: "", tags: [],
};

export default function CompanyForm() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, any>>(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (isNew) return;
    supabase.from("crm_companies").select("*").eq("id", id!).maybeSingle().then(({ data, error }) => {
      if (error) toast.error(error.message);
      if (data) {
        setForm({ ...EMPTY, ...data });
        setTagsInput(((data as any).tags ?? []).join(", "));
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload: any = { ...form };
    payload.tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    ["estimated_employees", "annual_revenue", "founded_year"].forEach((k) => {
      if (payload[k] === "" || payload[k] === null) payload[k] = null;
      else payload[k] = Number(payload[k]);
    });
    if (isNew) {
      const { error } = await supabase.from("crm_companies").insert(payload);
      if (error) { setSaving(false); return toast.error(error.message); }
      toast.success("Company created");
      navigate("/admin/prospect/companies");
    } else {
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase.from("crm_companies").update(payload).eq("id", id!);
      if (error) { setSaving(false); return toast.error(error.message); }
      toast.success("Company saved");
    }
    setSaving(false);
  };

  const remove = async () => {
    if (!confirm("Delete this company?")) return;
    const { error } = await supabase.from("crm_companies").delete().eq("id", id!);
    if (error) return toast.error(error.message);
    toast.success("Company deleted");
    navigate("/admin/prospect/companies");
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/prospect/companies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold">{isNew ? "New Company" : form.name || "Company"}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>}
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name *" k="name" />
          <Field label="Trade Name" k="trade_name" />
          <Field label="Domain" k="domain" />
          <Field label="Tax ID" k="tax_id" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Classification</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Sel label="Company Type" k="company_type" options={COMPANY_TYPE} />
          <Field label="Industry" k="industry" />
          <Sel label="Stage" k="stage" options={STAGE} />
          <Sel label="Status" k="status" options={STATUS} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Country" k="country" />
          <Field label="City" k="city" />
          <Field label="State" k="state" />
          <div className="md:col-span-2"><Field label="Address" k="address" /></div>
          <Field label="Postal Code" k="postal_code" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone" k="phone" />
          <Field label="Website" k="website" />
          <div className="md:col-span-2"><Field label="LinkedIn URL" k="linkedin_url" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Size</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Company Size (e.g. 51-200)" k="company_size" />
          <Field label="Estimated Employees" k="estimated_employees" type="number" />
          <Field label="Annual Revenue" k="annual_revenue" type="number" />
          <Field label="Founded Year" k="founded_year" type="number" />
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
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}