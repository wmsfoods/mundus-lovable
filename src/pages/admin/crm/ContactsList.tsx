import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  country: string | null;
  phone: string | null;
  lead_status: string | null;
  company_id: string | null;
  crm_companies: { name: string | null } | null;
};

const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-purple-100 text-purple-800",
  qualified: "bg-emerald-100 text-emerald-800",
  nurturing: "bg-amber-100 text-amber-800",
  opportunity: "bg-indigo-100 text-indigo-800",
  customer: "bg-green-100 text-green-800",
  lost: "bg-zinc-200 text-zinc-700",
  do_not_contact: "bg-red-100 text-red-800",
  unresponsive: "bg-orange-100 text-orange-800",
};

export default function ContactsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_contacts")
      .select("id,full_name,email,job_title,country,phone,lead_status,company_id,crm_companies(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.crm_companies?.name?.toLowerCase().includes(s)
    );
  });

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this contact?")) return;
    const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contact deleted");
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} contacts</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-full md:w-72" placeholder="Search name, email, company..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={() => navigate("/admin/prospect/people/new")}>
            <Plus className="h-4 w-4 mr-1" /> New Contact
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Lead Status</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No contacts</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/prospect/people/${r.id}`)}>
                <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                <TableCell>{r.email || "—"}</TableCell>
                <TableCell>{r.crm_companies?.name || "—"}</TableCell>
                <TableCell>{r.job_title || "—"}</TableCell>
                <TableCell>{r.country || "—"}</TableCell>
                <TableCell>
                  {r.lead_status ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[r.lead_status] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {r.lead_status}
                    </span>
                  ) : "—"}
                </TableCell>
                <TableCell>{r.phone || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/prospect/people/${r.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={(e) => remove(r.id, e)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}