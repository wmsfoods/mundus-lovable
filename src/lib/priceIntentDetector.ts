/**
 * Detect price proposals embedded in free-form chat messages.
 *
 *   "I can do $5.50 on the brisket and $5.20 on the point"
 *   "best I can do is 5.50 for the navel"
 *   "quero $5.50 no brisket"
 *
 * The matcher pairs every monetary value with the nearest product name token
 * (by character distance). If no product is found near a price, it falls back
 * to the first item in the negotiation. Values that fall outside a sane range
 * compared to the asking price are filtered out to avoid false positives on
 * quantities, percentages, etc.
 */

export type DetectableItem = {
  itemId: string;
  itemName: string;
  askingPrice: number;
  aliases?: string[]; // extra synonyms (e.g. product category)
};

export type DetectedPrice = {
  itemId: string;
  itemName: string;
  price: number;
  askingPrice: number;
  matchedText: string;
};

const PRICE_REGEX = /\$?\s*(\d{1,3}(?:[.,]\d{1,3})?)\s*(?:\/\s*(?:kg|lb))?/gi;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokenize(name: string): string[] {
  return normalize(name)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
}

/** Build an index of name-tokens → item, plus their character ranges in the message. */
function findItemPositions(message: string, items: DetectableItem[]): Array<{ item: DetectableItem; start: number; end: number; text: string }> {
  const lower = normalize(message);
  const found: Array<{ item: DetectableItem; start: number; end: number; text: string }> = [];
  for (const item of items) {
    const tokens = new Set<string>([
      ...tokenize(item.itemName),
      ...(item.aliases ?? []).flatMap(tokenize),
    ]);
    for (const tok of tokens) {
      let from = 0;
      while (true) {
        const idx = lower.indexOf(tok, from);
        if (idx === -1) break;
        // Require word boundary on at least one side to reduce noise.
        const before = idx === 0 ? " " : lower[idx - 1];
        const after = idx + tok.length >= lower.length ? " " : lower[idx + tok.length];
        if (/[a-z0-9]/.test(before) && /[a-z0-9]/.test(after)) {
          from = idx + tok.length;
          continue;
        }
        found.push({ item, start: idx, end: idx + tok.length, text: message.slice(idx, idx + tok.length) });
        from = idx + tok.length;
      }
    }
  }
  return found;
}

/** Plausibility check: drop "prices" that are obviously not prices (e.g. quantities, percentages). */
function isPlausiblePrice(price: number, asking: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (asking > 0) {
    // accept anything roughly 30% .. 300% of asking
    return price >= asking * 0.3 && price <= asking * 3;
  }
  // No asking reference — accept anything from 0.10 to 1000 $/kg
  return price >= 0.1 && price <= 1000;
}

export function detectPriceIntent(
  message: string,
  items: DetectableItem[],
): DetectedPrice[] {
  if (!message || items.length === 0) return [];

  // Skip percentage-heavy messages: "+3%", "-5%" are NOT price proposals.
  if (/^\s*[+\-±]?\s*\d+(?:[.,]\d+)?\s*%\s*$/.test(message.trim())) return [];

  const positions = findItemPositions(message, items);

  const prices: Array<{ value: number; start: number; end: number; raw: string }> = [];
  const re = new RegExp(PRICE_REGEX.source, PRICE_REGEX.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(message)) !== null) {
    const raw = m[0];
    // Skip pure percentages like "3%" — those are deltas, not prices.
    if (/%\s*$/.test(message.slice(m.index, re.lastIndex + 1))) continue;
    const value = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(value)) continue;
    prices.push({ value, start: m.index, end: re.lastIndex, raw });
  }
  if (prices.length === 0) return [];

  const claimed = new Set<string>();
  const out: DetectedPrice[] = [];

  for (const p of prices) {
    // Find the closest unclaimed item position by character distance.
    let best: { item: DetectableItem; dist: number } | null = null;
    for (const pos of positions) {
      if (claimed.has(pos.item.itemId)) continue;
      const dist = Math.min(Math.abs(pos.start - p.end), Math.abs(p.start - pos.end));
      if (!best || dist < best.dist) best = { item: pos.item, dist };
    }
    // Fallback: if no name match and only one item, assume it.
    const candidate = best?.item ?? (items.length === 1 ? items[0] : null);
    if (!candidate) continue;
    if (!isPlausiblePrice(p.value, candidate.askingPrice)) continue;
    claimed.add(candidate.itemId);
    out.push({
      itemId: candidate.itemId,
      itemName: candidate.itemName,
      price: p.value,
      askingPrice: candidate.askingPrice,
      matchedText: p.raw.trim(),
    });
  }

  return out;
}
