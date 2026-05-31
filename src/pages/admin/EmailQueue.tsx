import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Send, RotateCcw } from "lucide-react";

type Row = {
  id: string;
  to_email: string;
  subject: string;
  template_name: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  sending: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  sent: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

const STATUS_ICON: Record<string, string> = {
  queued: "⏳", sending: "🔄", sent: "✅", failed: "❌",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EmailQueue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("email_queue").select("*")
      .order("created_at", { ascending: false }).limit(100);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const processQueue = async () => {
    const t = toast.loading("Processing queue…");
    const { data, error } = await supabase.functions.invoke("send-email", { body: { mode: "batch" } });
    toast.dismiss(t);
    if (error) return toast.error(error.message);
    toast.success(`Sent: ${(data as any)?.sent ?? 0} · Failed: ${(data as any)?.failed ?? 0}`);
    void load();
  };

  const retryFailed = async () => {
    const failed = rows.filter((r) => r.status === "failed").map((r) => r.id);
    if (failed.length === 0) return toast.info("No failed emails");
    const { error } = await (supabase as any).from("email_queue")
      .update({ status: "queued", error_message: null }).in("id", failed);
    if (error) return toast.error(error.message);
    toast.success(`Re-queued ${failed.length}`);
    void load();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Email Queue</h1>
          <p className="text-sm text-muted-foreground">Recent platform email sends</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={retryFailed}>
            <RotateCcw className="h-4 w-4 mr-1.5" />Retry failed
          </Button>
          <Button size="sm" onClick={processQueue}>
            <Send className="h-4 w-4 mr-1.5" />Process queue
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left p-2.5">Status</th>
              <th className="text-left p-2.5">To</th>
              <th className="text-left p-2.5">Subject</th>
              <th className="text-left p-2.5">Template</th>
              <th className="text-left p-2.5">Created</th>
              <th className="text-left p-2.5">Sent</th>
              <th className="text-left p-2.5">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No emails in queue.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                <td className="p-2.5">
                  <Badge variant="outline" className={STATUS_STYLES[r.status] ?? ""}>
                    {STATUS_ICON[r.status] ?? "•"} {r.status}
                  </Badge>
                </td>
                <td className="p-2.5">{r.to_email}</td>
                <td className="p-2.5 max-w-[320px] truncate" title={r.subject}>{r.subject}</td>
                <td className="p-2.5 text-muted-foreground">{r.template_name ?? "—"}</td>
                <td className="p-2.5 text-muted-foreground">{timeAgo(r.created_at)}</td>
                <td className="p-2.5 text-muted-foreground">{r.sent_at ? timeAgo(r.sent_at) : "—"}</td>
                <td className="p-2.5 max-w-[280px] truncate text-rose-500" title={r.error_message ?? ""}>
                  {r.error_message ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}