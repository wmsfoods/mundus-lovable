import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMwInstancesCrud } from "@/hooks/mw/useMwInstancesCrud";
import type { MwInstance } from "@/hooks/mw/useMw";

const schema = z.object({
  name: z.string().min(1),
  evolution_instance_id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  instance_id_external: z.string().optional(),
  evolution_base_url: z.string().url(),
  evolution_api_key: z.string().optional(),
  provider_type: z.enum(["self_hosted", "cloud"]),
});
type Values = z.infer<typeof schema>;

interface Props { instance: MwInstance; open: boolean; onOpenChange: (o: boolean) => void; onSaved?: () => void }

export const EditInstanceDialog = ({ instance, open, onOpenChange, onSaved }: Props) => {
  const { busy, update } = useMwInstancesCrud(onSaved);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: instance.name,
      evolution_instance_id: instance.evolution_instance_id ?? "",
      instance_id_external: instance.instance_id_external ?? "",
      evolution_base_url: instance.evolution_base_url ?? "",
      evolution_api_key: "",
      provider_type: instance.provider_type ?? "self_hosted",
    },
  });
  const provider = form.watch("provider_type");

  useEffect(() => {
    form.reset({
      name: instance.name,
      evolution_instance_id: instance.evolution_instance_id ?? "",
      instance_id_external: instance.instance_id_external ?? "",
      evolution_base_url: instance.evolution_base_url ?? "",
      evolution_api_key: "",
      provider_type: instance.provider_type ?? "self_hosted",
    });
  }, [instance, form]);

  const onSubmit = async (v: Values) => {
    try {
      const patch: Record<string, unknown> = { ...v };
      if (!v.evolution_api_key) delete patch.evolution_api_key;
      await update(instance.id, patch as Parameters<typeof update>[1]);
      toast.success("Instância atualizada");
      onOpenChange(false);
    } catch (e) {
      toast.error(`Erro: ${e instanceof Error ? e.message : ""}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Instância</DialogTitle>
          <DialogDescription>Deixe a API key em branco para mantê-la.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="provider_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Provedor</FormLabel>
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
              <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="evolution_instance_id" render={({ field }) => (
              <FormItem><FormLabel>Nome da Instância</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            {provider === "cloud" && (
              <FormField control={form.control} name="instance_id_external" render={({ field }) => (
                <FormItem><FormLabel>ID da Instância (UUID)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            <FormField control={form.control} name="evolution_base_url" render={({ field }) => (
              <FormItem><FormLabel>URL da API</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="evolution_api_key" render={({ field }) => (
              <FormItem><FormLabel>{provider === "cloud" ? "Token da Instância" : "API Key"} (opcional)</FormLabel><FormControl><Input type="password" placeholder="Deixe em branco para manter" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};