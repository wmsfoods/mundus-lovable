import { autoCounter, type Dial } from "../supabase/functions/_shared/negotiation/autoEngineV3";

interface Scenario {
  name: string;
  asking: number;
  floor: number;
  bids: number[];
}

const SCENARIOS: Scenario[] = [
  { name: 'tight-margin',     asking: 7.0, floor: 6.5, bids: [6.30, 6.40, 6.45, 6.48] },
  { name: 'wide-margin',      asking: 7.0, floor: 3.0, bids: [3.50, 4.50, 5.50, 6.20] },
  { name: 'stalled-buyer',    asking: 7.0, floor: 6.0, bids: [6.30, 6.32, 6.33, 6.34] },
  { name: 'cooperative-buyer',asking: 7.0, floor: 6.0, bids: [5.00, 5.80, 6.20, 6.40] },
  { name: 'dropping-buyer',   asking: 7.0, floor: 6.0, bids: [6.50, 6.40, 6.30, 6.20] },
  { name: 'above-asking',     asking: 7.0, floor: 6.0, bids: [7.10] },
  { name: 'below-zopa',       asking: 7.0, floor: 6.0, bids: [3.00] },
];

const DIALS: Dial[] = ['protect_margin', 'balanced', 'win_deal'];

const pad = (s: string, n: number, right = false) => {
  if (s.length >= n) return s.slice(0, n);
  const sp = ' '.repeat(n - s.length);
  return right ? sp + s : s + sp;
};

const f2 = (n: number) => n.toFixed(2);
const f3 = (n: number) => n.toFixed(3);
const pct = (n: number) => (n * 100).toFixed(1) + '%';

const COLS = [
  { h: 'Cyc',      w: 3,  right: true  },
  { h: 'Bid',      w: 7,  right: true  },
  { h: 'Counter',  w: 9,  right: true  },
  { h: 'Decision', w: 12, right: false },
  { h: 'ψ(t,β)',   w: 7,  right: true  },
  { h: 'ρ(buy)',   w: 7,  right: true  },
  { h: 'Conc%',    w: 7,  right: true  },
  { h: 'Rule',     w: 22, right: false },
];

function line(ch: { l: string; m: string; r: string; fill: string }) {
  return ch.l + COLS.map(c => ch.fill.repeat(c.w + 2)).join(ch.m) + ch.r;
}

function row(cells: string[]) {
  return '│' + cells.map((c, i) => ' ' + pad(c, COLS[i].w, COLS[i].right) + ' ').join('│') + '│';
}

function header() {
  return row(COLS.map(c => c.h));
}

function runScenarioDial(sc: Scenario, dial: Dial) {
  console.log(`\n  ── ${sc.name}  ·  dial=${dial}  ·  asking=$${f2(sc.asking)}  floor=$${f2(sc.floor)}  margin=$${f2(sc.asking - sc.floor)}`);
  console.log('  ' + line({ l: '╭', m: '┬', r: '╮', fill: '─' }));
  console.log('  ' + header());
  console.log('  ' + line({ l: '├', m: '┼', r: '┤', fill: '─' }));

  let prevBid: number | null = null;
  let prevCounter: number | null = null;

  for (let i = 0; i < sc.bids.length; i++) {
    const cycle = (i + 1) as 1 | 2 | 3 | 4;
    const bid = sc.bids[i];
    const out = autoCounter({
      offerPrice: sc.asking,
      minimumPrice: sc.floor,
      bid,
      prevBid,
      prevCounter,
      cycle,
      dial,
    });
    const d = out.diagnostics;
    console.log('  ' + row([
      String(cycle),
      '$' + f2(bid),
      out.decision === 'hold' ? '$' + f2(out.price) : '$' + f2(out.price),
      out.decision,
      f3(d.psi),
      f3(d.rho),
      pct(d.concessionPct),
      out.rule,
    ]));
    prevBid = bid;
    if (out.decision === 'counter') prevCounter = out.price;
    if (out.decision === 'accept_bid') break;
  }
  console.log('  ' + line({ l: '╰', m: '┴', r: '╯', fill: '─' }));
}

function main() {
  const T = 4;
  console.log('═'.repeat(96));
  console.log('  AUTO NEGOTIATION ENGINE V3 — SIMULATION');
  console.log('═'.repeat(96));
  console.log('  Derived constants:');
  console.log(`    T (cycles)             = ${T}`);
  console.log(`    β protect_margin       = 1/e  ≈ ${(1/Math.E).toFixed(6)}   (Boulware — concedes late)`);
  console.log(`    β balanced             = 1                       (Linear)`);
  console.log(`    β win_deal             = e    ≈ ${Math.E.toFixed(6)}   (Conceder — concedes early)`);
  console.log(`    ε (floor buffer)       = m / (4T) = m/16`);
  console.log(`    γ (tit-for-tat scale)  = 1/T = ${1/T}`);
  console.log(`    ψ(t,β)                 = (t/T)^(1/β)             concession fraction`);
  console.log(`    c_curve                = a − (a − f_eff) · ψ`);
  console.log(`    c_final                = c_curve · (1 − ρ/T)     ρ = (bid − prevBid)/m clipped [0,1]`);
  console.log('═'.repeat(96));

  for (const sc of SCENARIOS) {
    console.log('\n' + '━'.repeat(96));
    console.log(`  SCENARIO: ${sc.name.toUpperCase()}`);
    console.log('━'.repeat(96));
    for (const dial of DIALS) {
      runScenarioDial(sc, dial);
    }
  }
  console.log('\n' + '═'.repeat(96));
}

main();