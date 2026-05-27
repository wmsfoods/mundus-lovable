import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Pencil, Trash2, Copy, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { EditInstanceDialog } from "./EditInstanceDialog";
import { useMwInstancesCrud } from "@/hooks/mw/useMwInstancesCrud";
import type { MwInstance } from "@/hooks/mw/useMw";

interface Props { instance: MwInstance; onChanged?: () => void }

export const InstanceCard = ({ instance, onChanged }: Props) => {
  const { busy, remove } = useMwInstancesCrud(onChanged);
  const [showDel, setShowDel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [testing, setTesting] = useState(false);

  const webhookUrl = instance.webhook_url ?? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mw-evolution-webhook`;

  const statusColor = instance.status === "connected" ? "bg-green-500" : instance.status === "connecting" ? "bg-yellow-500" : "bg-red-500";
  const statusText = instance.status === "connected" ? "Conectado" : instance.status === "connecting" ? "Conectando" : "Desconectado";

  const handleTest = async () => {
    if (!instance.evolution_base_url || !instance.evolution_api_key || !instance.evolution_instance_id) {
      toast.error("Credenciais incompletas");
      return;
    }
    setTesting(true);
    try {
      const url = `${instance.evolution_base_url.replace(/\/$/, "")}/instance/connectionState/${encodeURIComponent(instance.evolution_instance_id)}`;
      const res = await fetch(url, { headers: { apikey: instance.evolution_api_key } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Conexão OK");
    } catch (e) {
      toast.error(`Falha: ${e instanceof Error ? e.message : ""}`);
    } finally { setTesting(false); }
  };

  const handleDelete = async () => {
    try { await remove(instance.id); toast.success("Instância excluída"); setShowDel(false); }
    catch (e) { toast.error(`Erro: ${e instanceof Error ? e.message : ""}`); }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                {instance.name}
              </CardTitle>
              <Badge variant="outline" className="text-xs">{instance.evolution_instance_id ?? "—"}</Badge>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase">{instance.provider_type === "cloud" ? "Cloud" : "Self-Hosted"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm"><span className="text-muted-foreground">Status:</span> <span className="font-medium">{statusText}</span></div>
          <div className="text-sm"><span className="text-muted-foreground">Número:</span> {instance.phone_number ?? "—"}</div>
          <div className="text-sm"><span className="text-muted-foreground">Mensagens (30d):</span> {instance.message_count_30d}</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><LinkIcon className="h-3.5 w-3.5" />Webhook:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-2 py-1.5 rounded text-[11px] break-all font-mono">{webhookUrl}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada"); }} className="h-8 w-8 p-0 shrink-0"><Copy className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}><RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setShowDel(true)}><Trash2 className="h-4 w-4" /></Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDel} onOpenChange={setShowDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Conversas e mensagens vinculadas serão removidas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditInstanceDialog instance={instance} open={showEdit} onOpenChange={setShowEdit} onSaved={onChanged} />
    </>
  );
};