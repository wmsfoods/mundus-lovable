import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, QrCode, Settings, Copy, Webhook, CheckCircle2, Globe, MessageSquare, Shield, Zap, Rocket, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const steps = [
  { id: 1, phase: "evolution", title: "Acessar o Evolution", description: "Acesse sua instância Evolution API ou contrate via Cloudfy.", link: "https://www.cloudfy.host", linkText: "Contratar no Cloudfy", icon: Globe },
  { id: 2, phase: "evolution", title: "Criar instância", description: "No painel do Evolution, crie uma nova instância para conectar o WhatsApp.", icon: MessageSquare },
  { id: 3, phase: "evolution", title: "Conectar via QR Code", description: "Em ⚙️ da instância, selecione 'Get QR Code' e escaneie com o WhatsApp.", icon: QrCode },
  { id: 4, phase: "evolution", title: "Ignorar grupos", description: "Configurations > Settings, ative 'Ignore All Groups'.", icon: Shield },
  { id: 5, phase: "platform", title: "Criar instância na Mundus Whats", description: "Clique em '+ Nova Instância' abaixo.", icon: Zap },
  { id: 6, phase: "platform", title: "Preencher dados", description: "Nome, Nome da Instância (Evolution), URL e API Key.", icon: Settings },
  { id: 7, phase: "platform", title: "Testar conexão", description: "Clique em 'Testar conexão' antes de salvar.", icon: CheckCircle2 },
  { id: 8, phase: "webhook", title: "Copiar URL do Webhook", description: "Após salvar, copie a URL exibida no card da instância.", icon: Copy },
  { id: 9, phase: "webhook", title: "Configurar Webhook no Evolution", description: "Events > Webhook: Enable, cole a URL, ative 'Webhook base 64'.", icon: Webhook },
  { id: 10, phase: "webhook", title: "Ativar eventos", description: "Ative MESSAGES_UPSERT, MESSAGES_UPDATE e CONNECTION_UPDATE. Salve.", icon: CheckCircle2 },
  { id: 11, phase: "final", title: "Testar com mensagem real", description: "Envie uma mensagem ao número conectado para validar.", icon: CheckCircle2 },
];

const phaseColor = (p: string) =>
  p === "evolution" ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
  : p === "platform" ? "bg-green-500/10 text-green-600 border-green-500/20"
  : p === "webhook" ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
  : "bg-primary/10 text-primary border-primary/20";

const KEY = "mw-instance-setup-progress";

export const InstanceSetupCollapsible = ({ onOpenAddDialog }: { onOpenAddDialog?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<number[]>(() => {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(done)); }, [done]);

  const pct = Math.round((done.length / steps.length) * 100);
  const remaining = steps.length - done.length;
  const toggle = (id: number) => setDone((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button className="w-full justify-between h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span className="font-semibold">{done.length === steps.length ? "Configuração completa 🎉" : "Guia de Setup — Evolution API"}</span>
            {remaining > 0 && <span className="text-xs bg-primary-foreground/20 px-2 py-0.5 rounded-full">{remaining} passos</span>}
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="bg-muted p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm font-semibold">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {steps.map((s) => {
                const Icon = s.icon;
                const isDone = done.includes(s.id);
                return (
                  <AccordionItem key={s.id} value={`s-${s.id}`} className="border rounded-md">
                    <div className="flex items-start gap-2 px-3 py-2">
                      <Checkbox checked={isDone} onCheckedChange={() => toggle(s.id)} className="mt-2" />
                      <AccordionTrigger className="flex-1 hover:no-underline py-0">
                        <div className="flex items-center gap-2 text-left w-full">
                          <div className={cn("p-1.5 rounded-md border", phaseColor(s.phase))}><Icon className="h-4 w-4" /></div>
                          <span className={cn("text-sm flex-1", isDone && "line-through text-muted-foreground")}>{s.title}</span>
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="px-3 pb-3 pt-0 pl-12">
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>
                        {s.link && (
                          <Button variant="outline" size="sm" asChild className="w-full">
                            <a href={s.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-3 w-3" />{s.linkText}</a>
                          </Button>
                        )}
                        {s.id === 5 && onOpenAddDialog && (
                          <Button onClick={onOpenAddDialog} size="sm" className="w-full"><Zap className="mr-2 h-3 w-3" />Criar nova instância</Button>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
          <div className="border-t p-3 bg-muted/50">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDone([]); localStorage.removeItem(KEY); toast.success("Progresso resetado"); }}>
              Resetar progresso
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};