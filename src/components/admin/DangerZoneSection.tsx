import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DangerResetModal } from "./DangerResetModal";

type Counts = Record<string, number>;

export function DangerZoneSection() {
  const [open, setOpen] = useState<null | "soft" | "hard">(null);
  const [result, setResult] = useState<{ level: "soft" | "hard"; counts: Counts } | null>(null);

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold uppercase tracking-wider text-destructive">
          ⚠️ Danger Zone
        </span>
        <span className="text-xs text-muted-foreground">
          Destructive — Mundus admins only
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="border-amber-400/60 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🟡 Soft Reset Playground</CardTitle>
            <CardDescription>Transactional data only — safe for UAT loops.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Deletes: offers, negotiations, orders, requests, notifications.</li>
              <li>Preserves: catalog (countries, ports, cuts), companies, users, supplier brands, plants, audit logs.</li>
              <li>Use for: UAT loops, demo prep.</li>
            </ul>
            <Button
              variant="outline"
              className="border-amber-500 text-amber-700 hover:bg-amber-100"
              onClick={() => setOpen("soft")}
            >
              🔄 Soft Reset
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/60 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">🔥 Hard Wipe Playground</CardTitle>
            <CardDescription>Factory reset — everything Soft Reset does PLUS supplier config.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>Also deletes: supplier brands and company plants.</li>
              <li>Use for: factory reset before onboarding a new supplier from scratch.</li>
              <li>⚠️ Catalog, companies and users are still preserved.</li>
            </ul>
            <Button variant="destructive" onClick={() => setOpen("hard")}>
              🔥 Hard Wipe
            </Button>
          </CardContent>
        </Card>
      </div>

      {open && (
        <DangerResetModal
          open={!!open}
          onOpenChange={(o) => { if (!o) setOpen(null); }}
          level={open}
          onConfirmed={(counts) => setResult({ level: open!, counts })}
        />
      )}

      <Dialog open={!!result} onOpenChange={(o) => { if (!o) setResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Reset complete — {result?.level}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-auto rounded border bg-muted/30 p-3 text-xs font-mono">
            {result && Object.entries(result.counts).length === 0 ? (
              <div className="text-muted-foreground">No rows deleted.</div>
            ) : (
              <table className="w-full">
                <tbody>
                  {result &&
                    Object.entries(result.counts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <tr key={k} className="border-b border-border/50 last:border-0">
                          <td className="py-1 pr-3">{k}</td>
                          <td className="py-1 text-right tabular-nums">{v}</td>
                        </tr>
                      ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResult(null)}>Close</Button>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}