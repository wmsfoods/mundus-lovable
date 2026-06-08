import { useMemo, useState } from "react";
import {
  autoCounter,
  type AutoOutput,
  type Dial,
} from "../../../supabase/functions/_shared/negotiation/autoEngineV3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from "recharts";

const DIALS: { key: Dial; label: string; sub: string; color: string }[] = [
  { key: "protect_margin", label: "protect_margin", sub: "Boulware (β=1/e)", color: "#2563eb" },
  { key: "balanced", label: "balanced", sub: "Linear (β=1)", color: "#6b7280" },
  { key: "win_deal", label: "win_deal", sub: "Conceder (β=e)", color: "#16a34a" },
];

type Row = { cycle: number; bid: number; out: AutoOutput };

function runDial(asking: number, floor: number, bids: (number | null)[], dial: Dial): Row[] {
  const rows: Row[] = [];
  let prevBid: number | null = null;
  let prevCounter: number | null = null;
  for (let i = 0; i < bids.length; i++) {
    const b = bids[i];
    if (b == null || Number.isNaN(b)) break;
    const cycle = (i + 1) as 1 | 2 | 3 | 4;
    const out = autoCounter({
      offerPrice: asking,
      minimumPrice: floor,
      bid: b,
      prevBid,
      prevCounter,
      cycle,
      dial,
    });
    rows.push({ cycle, bid: b, out });
    if (out.decision !== "counter") break;
    prevBid = b;
    prevCounter = out.price;
  }
  return rows;
}

function decisionBadge(d: AutoOutput["decision"]) {
  const map = {
    counter: "bg-gray-200 text-gray-800",
    accept_bid: "bg-green-100 text-green-800",
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${map[d]}`}>{d}</span>
  );
}

const fmt = (n: number, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : "—");

export default function AutoEngineSandbox() {
  const [asking, setAsking] = useState(7.0);
  const [floor, setFloor] = useState(6.0);
  const [bidStr, setBidStr] = useState<string[]>(["6.30", "6.40", "6.50", "6.60"]);
  const [ran, setRan] = useState(0);

  const margin = asking - floor;
  const T = 4;
  const epsilon = margin / (4 * T);

  const bids = bidStr.map((s) => {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : null;
  });

  const valid = asking > floor && bids.some((b) => b != null && b > 0);

  const results = useMemo(() => {
    if (!valid) return null;
    return DIALS.map((d) => ({ dial: d, rows: runDial(asking, floor, bids, d.key) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran]);

  const chartData = useMemo(() => {
    if (!results) return [];
    const data: any[] = [];
    for (let c = 1; c <= 4; c++) {
      const row: any = { cycle: c };
      const bid = bids[c - 1];
      if (bid != null) row.bid = bid;
      for (const r of results) {
        const found = r.rows.find((x) => x.cycle === c);
        if (found && found.out.decision === "counter") {
          row[r.dial.key] = found.out.price;
        }
      }
      data.push(row);
    }
    return data;
  }, [results, bids]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Auto-Negotiation Sandbox</h1>
        <p className="text-sm text-muted-foreground">
          V3.1 · Faratin Polite · all math runs client-side, nothing persists.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derived constants</CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm space-y-1">
          <div>T = 4 cycles · γ = 1/T = 0.25 (tit-for-tat strength)</div>
          <div>β: protect = 1/e ≈ 0.3679 · balanced = 1 · win = e ≈ 2.7183</div>
          <div>m = asking − floor = ${fmt(margin, 4)}</div>
          <div>ε = m/(4T) = ${fmt(epsilon, 4)} /kg (floor buffer & accept gap)</div>
          <div>c_final = c_curve − ρ · m/T</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="text-xs font-medium">Asking price ($/kg)</label>
              <Input
                type="number"
                step="0.01"
                value={asking}
                onChange={(e) => setAsking(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Floor price ($/kg)</label>
              <Input
                type="number"
                step="0.01"
                value={floor}
                onChange={(e) => setFloor(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-2">Buyer bids per cycle ($/kg)</div>
            <div className="grid grid-cols-4 gap-3 max-w-2xl">
              {bidStr.map((v, i) => (
                <div key={i}>
                  <label className="text-xs text-muted-foreground">Cycle {i + 1}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={v}
                    onChange={(e) => {
                      const next = [...bidStr];
                      next[i] = e.target.value;
                      setBidStr(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setRan((x) => x + 1)} disabled={!valid}>
              Run simulation
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAsking(7);
                setFloor(6);
                setBidStr(["6.30", "6.40", "6.50", "6.60"]);
                setRan((x) => x + 1);
              }}
            >
              Reset
            </Button>
          </div>
          {!valid && (
            <p className="text-xs text-amber-600">
              Asking must be greater than floor and at least one bid must be {">"} 0.
            </p>
          )}
        </CardContent>
      </Card>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {results.map(({ dial, rows }) => (
            <Card key={dial.key}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: dial.color }}
                  />
                  {dial.label}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{dial.sub}</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8">Cy</TableHead>
                        <TableHead className="h-8">Bid</TableHead>
                        <TableHead className="h-8">Counter</TableHead>
                        <TableHead className="h-8">Dec</TableHead>
                        <TableHead className="h-8">ψ</TableHead>
                        <TableHead className="h-8">ρ</TableHead>
                        <TableHead className="h-8">Conc%</TableHead>
                        <TableHead className="h-8">Rule</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.cycle}>
                          <TableCell className="py-1.5 font-mono">{r.cycle}</TableCell>
                          <TableCell className="py-1.5 font-mono">${fmt(r.bid, 2)}</TableCell>
                          <TableCell className="py-1.5 font-mono">${fmt(r.out.price, 2)}</TableCell>
                          <TableCell className="py-1.5">{decisionBadge(r.out.decision)}</TableCell>
                          <TableCell className="py-1.5 font-mono">{fmt(r.out.diagnostics.psi, 3)}</TableCell>
                          <TableCell className="py-1.5 font-mono">{fmt(r.out.diagnostics.rho, 3)}</TableCell>
                          <TableCell className="py-1.5 font-mono">{(r.out.diagnostics.concessionPct * 100).toFixed(1)}%</TableCell>
                          <TableCell className="py-1.5 font-mono text-xs">{r.out.rule}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Counter trajectories</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cycle" label={{ value: "Cycle", position: "insideBottom", offset: -5 }} />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.min(floor, dataMin) - 0.1,
                    (dataMax: number) => Math.max(asking, dataMax) + 0.1,
                  ]}
                  tickFormatter={(v) => `$${v.toFixed(2)}`}
                />
                <Tooltip formatter={(v: any) => (typeof v === "number" ? `$${v.toFixed(4)}` : v)} />
                <Legend />
                <ReferenceLine y={floor} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `floor $${floor.toFixed(2)}`, position: "insideBottomRight", fill: "#dc2626", fontSize: 11 }} />
                <ReferenceLine y={asking} stroke="#15803d" strokeDasharray="4 4" label={{ value: `asking $${asking.toFixed(2)}`, position: "insideTopRight", fill: "#15803d", fontSize: 11 }} />
                {DIALS.map((d) => (
                  <Line
                    key={d.key}
                    type="monotone"
                    dataKey={d.key}
                    stroke={d.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                    name={d.label}
                  />
                ))}
                <Scatter dataKey="bid" fill="#111827" name="buyer bid" shape="circle" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}