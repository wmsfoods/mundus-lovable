import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type Row = {
  id: string; name: string; domain: string | null; country: string | null;
  city: string | null; company_type: string | null; stage: string | null; phone: string | null;
};

const BADGE: Record<string, string> = {
  prospect: "bg-blue-100 text-blue-800",
  buyer: "bg-emerald-100 text-emerald-800",
  supplier: "bg-amber-100 text-amber-800",
  customer: "bg-green-100 text-green-800",
  cold: "bg-zinc-200 text-zinc-700",
  warm: "bg-orange-100 text-orange-800",
  hot: "bg-red-100 text-red-800",
};

export default function CompaniesList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_companies")
      .select("id,name,domain,country,city,company_type,stage,phone")
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
    return r.name?.toLowerCase().includes(s) || r.domain?.toLowerCase().includes(s) || r.country?.toLowerCase().includes(s);
  });

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this company?")) return;
    const { error } = await supabase.from("crm_companies").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Company deleted");
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} companies</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-full md:w-72" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={() => navigate("/admin/prospect/companies/new")}>
            <Plus className="h-4 w-4 mr-1" /> New Company
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No companies</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/prospect/companies/${r.id}`)}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.domain || "—"}</TableCell>
                <TableCell>{r.country || "—"}</TableCell>
                <TableCell>{r.city || "—"}</TableCell>
                <TableCell>
                  {r.company_type ? <span className={`px-2 py-0.5 rounded text-xs ${BADGE[r.company_type] ?? "bg-zinc-100 text-zinc-700"}`}>{r.company_type}</span> : "—"}
                </TableCell>
                <TableCell>
                  {r.stage ? <span className={`px-2 py-0.5 rounded text-xs ${BADGE[r.stage] ?? "bg-zinc-100 text-zinc-700"}`}>{r.stage}</span> : "—"}
                </TableCell>
                <TableCell>{r.phone || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/prospect/companies/${r.id}`)}>
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