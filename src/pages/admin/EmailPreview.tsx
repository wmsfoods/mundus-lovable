import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emailTemplates, type EmailTemplateName } from "@/lib/emailTemplates";

const samples: Record<EmailTemplateName, any> = {
  welcome: { name: "Maria Silva", company: "Friboi Exports", email: "maria@friboi.com", role: "Supplier", country: "Brazil", countryFlag: "🇧🇷" },
  passwordReset: { name: "Maria Silva", resetUrl: "https://app.mundustrade.us/reset?token=abc123" },
  newOffer: { buyerName: "John Chen", cutName: "Beef Striploin IMPS 180", offerNumber: "00042", origin: "Brazil", originFlag: "🇧🇷", destination: "China", destFlag: "🇨🇳", quantity: "26,400", fcls: "2", containerSize: "40' FCL", incoterm: "CFR", shipment: "Mar 2026", priceFrom: "5.40", supplierCompany: "Friboi Exports" },
  newRequest: { supplierName: "Maria Silva", productName: "Pork Belly Boneless", requestNumber: "00018", buyerCompany: "China Foods Co.", destination: "Shanghai, China", destFlag: "🇨🇳", quantity: "28,000", containerSize: "40' FCL", incoterm: "CFR", targetPrice: "3.80", shipment: "Apr 2026" },
  bidReceived: { supplierName: "Maria Silva", buyerCompany: "China Foods Co.", buyerCountry: "China", buyerFlag: "🇨🇳", offerNumber: "00042", cutName: "Beef Striploin IMPS 180", round: 1, maxRounds: 8, askingPrice: "5.40", bidPrice: "4.95", gap: "0.45", gapPct: "8.3", totalValue: "130,680", destination: "Shanghai", destFlag: "🇨🇳" },
  counterReceived: { buyerName: "John Chen", supplierCompany: "Friboi Exports", offerNumber: "00042", cutName: "Beef Striploin IMPS 180", round: 3, maxRounds: 8, askingPrice: "5.40", yourBid: "4.95", counterPrice: "5.20", gap: "0.25", gapPct: "4.6", totalValue: "137,280", isLastRound: false },
  dealClosed: { name: "John Chen", cutName: "Beef Striploin IMPS 180", offerNumber: "00042", quantity: "26,400", rounds: 4, askingPrice: "5.40", finalPrice: "5.10", movementPct: "-5.5", totalValue: "134,640", incoterm: "CFR", origin: "Brazil", originFlag: "🇧🇷", destination: "China", destFlag: "🇨🇳", shipment: "Mar 2026", supplierCompany: "Friboi Exports", buyerCompany: "China Foods Co.", advancePct: "30", advanceAmount: "40,392" },
  dealAwaitingConfirmation: { name: "Friboi Exports", cutName: "Beef Striploin IMPS 180", offerNumber: "00042", totalValue: "134,640", acceptedBy: "buyer", counterpartyCompany: "China Foods Co.", negotiationUrl: "https://app.mundustrade.us/supplier/negotiations/abc" },
  negotiationRejected: { name: "John Chen", cutName: "Beef Striploin IMPS 180", offerNumber: "00042", lastBid: "4.95", lastCounter: "5.30", gap: "0.35", gapPct: "6.6", rounds: 6, reason: "Price gap too wide for current market." },
  orderStatusUpdate: { name: "John Chen", offerNumber: "00042", cutName: "Beef Striploin IMPS 180", quantity: "26,400", totalValue: "134,640", statusLabel: "Payment Received", statusMessage: "Your advance payment has been received. Production scheduled.", statusStep: 1 },
  staleNudge: { name: "Maria Silva", cutName: "Beef Striploin IMPS 180", offerNumber: "00042", round: 2, maxRounds: 8, waitingFor: "counter", hours: 36, gap: "0.45", gapPct: "8.3", expiryDate: "Mar 15, 2026" },
  offerShared: { senderName: "Maria Silva", senderCompany: "Friboi Exports", cutName: "Beef Striploin IMPS 180", origin: "Brazil", originFlag: "🇧🇷", quantity: "26,400", priceFrom: "5.40", incoterm: "CFR", shipment: "Mar 2026", viewUrl: "https://app.mundustrade.us/buyer/offers/00042" },
  customerInvitation: { recipientName: "John Chen", inviterCompany: "Friboi Exports", inviterName: "Maria Silva", inviterEmail: "maria@friboi.com" },
  weeklyDigest: { name: "Maria Silva", dateRange: "May 19 – May 25, 2026", activeOffers: 12, newBids: 28, activeNegos: 6, dealsClosed: 3, revenue: "412,500", marketHighlight: "Beef striploin prices rose 4.2% week-over-week driven by stronger Asian demand.", topOffers: [{ cut: "Beef Striploin", price: "5.40", country: "🇧🇷 Brazil" }, { cut: "Pork Belly", price: "3.85", country: "🇺🇸 USA" }, { cut: "Chicken Leg", price: "1.95", country: "🇧🇷 Brazil" }] },
  publicLeadCaptured: { email: "lead@example.com", name: "Jane Buyer", company: "ACME Foods", phone: "+1 555 123 4567", country: "United States", protein: "beef", leadType: "buyer", mundusRep: "Fernando Nascimento", lang: "en" },
  scl_invite_existing: { supplier: "Friboi Exports", recipientName: "John Chen" },
  scl_invite_signup: { supplier: "Friboi Exports", linkId: "abc-123" },
  scl_direct_offer: { supplier: "Friboi Exports", offerTitle: "Beef Striploin IMPS 180 — Brazil → China, Mar 2026", offerId: "abc-123" },
  scl_all_customers_offer: { supplier: "Friboi Exports", offerTitle: "Beef Striploin IMPS 180 — Brazil → China, Mar 2026", offerId: "abc-123" },
};

const templateNames = Object.keys(emailTemplates) as EmailTemplateName[];

export default function EmailPreview() {
  const [selected, setSelected] = useState<EmailTemplateName>("welcome");

  const html = useMemo(() => {
    const fn = emailTemplates[selected] as (v: any) => string;
    return fn(samples[selected]);
  }, [selected]);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      toast.success("HTML copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, height: "100vh" }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Email Template Preview</h1>
        <p style={{ color: "var(--fg-muted, #6B7280)", marginTop: 4 }}>Internal tool to preview all 13 Mundus email templates.</p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 260 }}>
          <Select value={selected} onValueChange={(v) => setSelected(v as EmailTemplateName)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {templateNames.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={copyHtml}>Copy HTML</Button>
        <Button variant="outline" disabled title="Coming soon">Send Test Email</Button>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6B7280" }}>
          {templateNames.indexOf(selected) + 1} of {templateNames.length}
        </span>
      </div>

      <iframe
        title="Email preview"
        srcDoc={html}
        style={{ flex: 1, width: "100%", border: "1px solid hsl(var(--border))", borderRadius: 8, background: "#fff", minHeight: 0 }}
      />
    </div>
  );
}