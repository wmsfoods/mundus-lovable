import type { OutreachOffer } from "@/hooks/useSupplierOutreach";

export function buildOutreachSubject(offer: OutreachOffer) {
  return `New Meat Offer — ${offer.title} from ${offer.origin} | Mundus Trade`;
}

export function buildOutreachBody(offer: OutreachOffer, contactName?: string | null) {
  const greeting = contactName ? `Dear ${contactName.split(" ")[0]},` : "Dear partner,";
  const price = offer.pricePerKg
    ? `<strong>US$ ${offer.pricePerKg.toFixed(2)} / kg</strong>`
    : "—";
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1f1f1f;max-width:600px;margin:0 auto;padding:24px;">
  <div style="border-bottom:3px solid #9B2251;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="color:#9B2251;margin:0;font-size:22px;">Mundus Trade</h1>
  </div>
  <p>${greeting}</p>
  <p>We have a new offer that matches your market:</p>
  <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px;margin:16px 0;">
    <h2 style="margin:0 0 8px;font-size:18px;color:#1f1f1f;">${offer.title}</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:4px 0;color:#666;">Origin</td><td style="padding:4px 0;"><strong>${offer.origin}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666;">Destination markets</td><td style="padding:4px 0;"><strong>${offer.markets.join(", ") || "—"}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666;">Incoterm</td><td style="padding:4px 0;"><strong>${offer.incoterm}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#666;">Price</td><td style="padding:4px 0;">${price}</td></tr>
      <tr><td style="padding:4px 0;color:#666;">Container</td><td style="padding:4px 0;"><strong>${offer.totalFcl} FCL</strong></td></tr>
    </table>
  </div>
  <p>Interested? Simply reply to this email or view the full offer on Mundus Trade.</p>
  <p style="margin-top:32px;">Best regards,<br/><strong>The Mundus Trade Team</strong></p>
  <hr style="border:none;border-top:1px solid #eee;margin-top:32px;"/>
  <p style="color:#888;font-size:12px;text-align:center;margin-top:16px;">Mundus Trade — mundus.trade</p>
</div>`.trim();
}