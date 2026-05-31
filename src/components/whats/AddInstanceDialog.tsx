import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Check, Copy, Link as LinkIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { useMwInstancesCrud } from "@/hooks/mw/useMwInstancesCrud";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  evolution_instance_id: z.string().min(1, "Nome da instância obrigatório").regex(/^[a-zA-Z0-9_-]+$/, "Apenas letras, números, _ e -"),
  instance_id_external: z.string().optional(),
  evolution_base_url: z.string().url("URL inválida"),
  evolution_api_key: z.string().min(1, "Token obrigatório"),
  provider_type: z.enum(["self_hosted", "cloud"]),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export const AddInstanceDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { busy, create } = useMwInstancesCrud(onCreated);
  const [tested, setTested] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", evolution_instance_id: "", instance_id_external: "", evolution_base_url: "", evolution_api_key: "", provider_type: "self_hosted" },
  });
  const provider = form.watch("provider_type");
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mw-evolution-webhook`;

  const handleTest = async () => {
    const fields: (keyof Values)[] = provider === "cloud"
      ? ["evolution_base_url", "evolution_api_key", "evolution_instance_id", "instance_id_external"]
      : ["evolution_base_url", "evolution_api_key", "evolution_instance_id"];
    const ok = await form.trigger(fields);
    if (!ok) { toast.error("Preencha os campos obrigatórios para testar"); return; }
    // Lightweight ping: try fetching instance info
    const v = form.getValues();
    try {
      const url = `${v.evolution_base_url.replace(/\/$/, "")}/instance/connectionState/${encodeURIComponent(v.evolution_instance_id)}`;
      const res = await fetch(url, { headers: { apikey: v.evolution_api_key } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTested(true);
      toast.success("Conexão testada com sucesso");
    } catch (e) {
      setTested(false);
      toast.error(`Falha ao testar conexão: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
  };

  const onSubmit = async (v: Values) => {
    try {
      await create(v as Parameters<typeof create>[0]);
      setShowWebhook(true);
      form.reset();
      setTested(false);
    } catch (e) {
      toast.error(`Erro ao criar instância: ${e instanceof Error ? e.message : ""}`);
    }
  };

  const handleClose = () => {
    form.reset();
    setTested(false);
    setShowWebhook(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        {!showWebhook ? (
          <>
            <DialogHeader>
              <DialogTitle>Nova Instância</DialogTitle>
              <DialogDescription>Conecte uma instância da Evolution API</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="provider_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Tipo de Provedor
                      <Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                        <TooltipContent className="max-w-[250px]"><p>Self-Hosted: Evolution em servidor próprio. Cloud: evoapicloud.com.</p></TooltipContent>
                      </Tooltip>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="self_hosted">Evolution API Self-Hosted</SelectItem>
                        <SelectItem value="cloud">Evolution API Cloud</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input placeholder="Ex: Mundus Comercial" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="evolution_instance_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Instância (Evolution)</FormLabel>
                    <FormControl><Input placeholder="mundus-comercial" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {provider === "cloud" && (
                  <FormField control={form.control} name="instance_id_external" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da Instância (UUID)</FormLabel>
                      <FormControl><Input placeholder="ead6f2f2-7633-4e41-a08d-7272300a6ba1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="evolution_base_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da API</FormLabel>
                    <FormControl><Input placeholder={provider === "cloud" ? "https://api.evoapicloud.com" : "https://api.evolution.com"} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="evolution_api_key" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{provider === "cloud" ? "Token da Instância" : "API Key"}</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleTest}>
                    {tested ? <Check className="mr-2 h-4 w-4" /> : null}
                    Testar conexão
                  </Button>
                  <Button type="submit" className="ml-auto" disabled={!tested || busy}>
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" />Instância criada!</DialogTitle>
              <DialogDescription>Configure o webhook na Evolution API</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <LinkIcon className="h-4 w-4" />
                <AlertDescription className="space-y-2 mt-2">
                  <div>
                    <strong>URL do Webhook:</strong>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 bg-muted p-2 rounded text-xs break-all">{webhookUrl}</code>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiada!"); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <strong>Eventos:</strong>
                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                      <li>MESSAGES_UPSERT</li>
                      <li>MESSAGES_UPDATE</li>
                      <li>CONNECTION_UPDATE</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              <Button onClick={handleClose} className="w-full">Fechar</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};