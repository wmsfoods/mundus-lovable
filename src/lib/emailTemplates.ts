// Mundus Trade — HTML email template engine.
// All templates produce standalone, table-based, inline-CSS HTML that
// renders consistently across major email clients (Gmail, Outlook, Apple
// Mail, Yahoo). Responsive at 600px via @media queries.

function masterLayout(options: {
  heroTitle: string;
  heroColor?: "wine" | "green" | "amber" | "gray";
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  preheader?: string;
}): string {
  const { heroTitle, heroColor = "wine", bodyHtml, ctaUrl, ctaLabel, preheader } = options;

  const heroGradients: Record<string, string> = {
    wine: "background: linear-gradient(135deg, #6C0B28, #A74764);",
    green: "background: linear-gradient(135deg, #065F46, #059669);",
    amber: "background: linear-gradient(135deg, #92400E, #D97706);",
    gray: "background: linear-gradient(135deg, #374151, #6B7280);",
  };

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${heroTitle}</title>
  ${preheader ? `<!--[if !mso]><!--><span style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</span><!--<![endif]-->` : ""}
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 24px 16px !important; }
      .hero-padding { padding: 20px 16px !important; }
      .cta-button { width: 100% !important; display: block !important; text-align: center !important; }
      .data-card { padding: 12px !important; }
      .stack-col { display: block !important; width: 100% !important; }
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1A1B26 !important; }
      .email-card { background-color: #0E0F14 !important; }
      .data-card-bg { background-color: #161720 !important; border-color: #26262E !important; }
      .text-dark { color: #EAEAF0 !important; }
      .text-muted { color: #72728A !important; }
      .footer-text { color: #505060 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F4F7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;" class="email-bg">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F4F4F7;" class="email-bg">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="email-container email-card" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:20px 32px;border-bottom:1px solid #F3F4F6;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <img src="https://app.mundustrade.us/favicon.png" alt="Mundus Trade" width="36" height="36" style="display:inline-block;vertical-align:middle;border:0;">
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#8B2252;vertical-align:middle;margin-left:8px;">Mundus</span>
                    <span style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:600;color:#A74764;vertical-align:middle;letter-spacing:2px;margin-left:2px;">TRADE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="${heroGradients[heroColor]} padding:24px 32px;" class="hero-padding">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${heroTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;" class="content-padding">
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1A1A2E;" class="text-dark">
                ${bodyHtml}
              </div>
              ${ctaUrl && ctaLabel ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" target="_blank" class="cta-button" style="display:inline-block;padding:14px 36px;background-color:#8B2252;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;mso-padding-alt:0;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #F3F4F6;background-color:#FAFAFA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;line-height:1.6;" class="footer-text">
                    <p style="margin:0 0 8px;">Mundus Trade LLC · Ocoee, FL — United States</p>
                    <p style="margin:0 0 8px;">
                      <a href="https://app.mundustrade.us" style="color:#8B2252;text-decoration:none;">app.mundustrade.us</a>
                    </p>
                    <p style="margin:0 0 12px;">
                      <a href="https://linkedin.com/company/mundustrade" style="color:#9CA3AF;text-decoration:none;margin:0 6px;">LinkedIn</a> ·
                      <a href="https://instagram.com/mundustrade" style="color:#9CA3AF;text-decoration:none;margin:0 6px;">Instagram</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:#B0B0B0;">
                      You received this because you have an account on Mundus Trade.<br>
                      <a href="{{unsubscribe_url}}" style="color:#9CA3AF;text-decoration:underline;">Unsubscribe</a> ·
                      <a href="{{preferences_url}}" style="color:#9CA3AF;text-decoration:underline;">Manage preferences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function dataCard(rows: Array<{ label: string; value: string; bold?: boolean }>): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;" class="data-card-bg">
      ${rows.map(r => `
        <tr>
          <td style="padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;width:40%;border-bottom:1px solid #F3F4F6;" class="text-muted">${r.label}</td>
          <td style="padding:8px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1A1A2E;${r.bold ? 'font-weight:700;' : ''}border-bottom:1px solid #F3F4F6;" class="text-dark">${r.value}</td>
        </tr>
      `).join("")}
    </table>`;
}

function priceRow(label: string, value: string, color?: string): string {
  return `
    <tr>
      <td style="padding:6px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;">${label}</td>
      <td style="padding:6px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${color || '#1A1A2E'};text-align:right;">${value}</td>
    </tr>`;
}

export const emailTemplates = {
  welcome: (vars: { name: string; company: string; email: string; role: string; country: string; countryFlag: string }) => masterLayout({
    heroTitle: "Welcome to Mundus Trade 🎉",
    heroColor: "wine",
    preheader: `Welcome ${vars.name}! Your account on Mundus Trade is ready.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">Your account has been created successfully. You're now part of the global protein trading network.</p>
      ${dataCard([
        { label: "Company", value: vars.company, bold: true },
        { label: "Email", value: vars.email },
        { label: "Role", value: vars.role },
        { label: "Country", value: `${vars.countryFlag} ${vars.country}` },
      ])}
      <p style="margin:20px 0 8px;font-weight:600;">Here's what you can do next:</p>
      <p style="margin:0 0 4px;">✅ Complete your company profile</p>
      <p style="margin:0 0 4px;">✅ Set your protein preferences</p>
      <p style="margin:0 0 4px;">✅ Browse the marketplace</p>
      <p style="margin:0 0 4px;">✅ Create your first ${vars.role === "Supplier" ? "offer" : "request"}</p>
    `,
    ctaUrl: "https://app.mundustrade.us",
    ctaLabel: "Get Started →",
  }),

  passwordReset: (vars: { name: string; resetUrl: string }) => masterLayout({
    heroTitle: "Reset Your Password",
    heroColor: "gray",
    preheader: "Reset your Mundus Trade password",
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">We received a request to reset your password for your Mundus Trade account. Click the button below to set a new password.</p>
      <p style="margin:24px 0 8px;font-size:13px;color:#6B7280;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
      <p style="margin:8px 0;font-size:12px;color:#9CA3AF;word-break:break-all;">If the button doesn't work, copy this link:<br>${vars.resetUrl}</p>
    `,
    ctaUrl: vars.resetUrl,
    ctaLabel: "Reset Password →",
  }),

  newOffer: (vars: { buyerName: string; cutName: string; offerNumber: string; origin: string; originFlag: string; destination: string; destFlag: string; quantity: string; fcls: string; containerSize: string; incoterm: string; shipment: string; priceFrom: string; supplierCompany: string }) => masterLayout({
    heroTitle: "New Offer Available",
    heroColor: "wine",
    preheader: `New ${vars.cutName} offer from ${vars.origin} — M-${vars.offerNumber}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.buyerName}</strong>,</p>
      <p style="margin:0 0 16px;">A new offer matching your protein profile is available on the marketplace.</p>
      ${dataCard([
        { label: "Product", value: `🥩 ${vars.cutName}`, bold: true },
        { label: "Offer", value: `M-${vars.offerNumber}` },
        { label: "Origin", value: `${vars.originFlag} ${vars.origin}` },
        { label: "Destination", value: `${vars.destFlag} ${vars.destination}` },
        { label: "Quantity", value: `${vars.quantity} kg per FCL` },
        { label: "Container", value: `${vars.fcls} × ${vars.containerSize}` },
        { label: "Incoterm", value: vars.incoterm },
        { label: "Shipment", value: vars.shipment },
        { label: "Price from", value: `US$ ${vars.priceFrom}/kg`, bold: true },
        { label: "Supplier", value: vars.supplierCompany },
      ])}
    `,
    ctaUrl: `https://app.mundustrade.us/buyer/offers/${vars.offerNumber}`,
    ctaLabel: "View Offer & Place Bid →",
  }),

  newRequest: (vars: { supplierName: string; productName: string; requestNumber: string; buyerCompany: string; destination: string; destFlag: string; quantity: string; containerSize: string; incoterm: string; targetPrice: string; shipment: string }) => masterLayout({
    heroTitle: "New Buyer Request",
    heroColor: "wine",
    preheader: `New request for ${vars.productName} to ${vars.destination} — R-${vars.requestNumber}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.supplierName}</strong>,</p>
      <p style="margin:0 0 16px;">A buyer is looking for products you supply. Review the request and create an offer if you're interested.</p>
      ${dataCard([
        { label: "Product", value: `🔍 ${vars.productName}`, bold: true },
        { label: "Request", value: `R-${vars.requestNumber}` },
        { label: "Buyer", value: vars.buyerCompany },
        { label: "Destination", value: `${vars.destFlag} ${vars.destination}` },
        { label: "Quantity", value: `${vars.quantity} kg` },
        { label: "Container", value: vars.containerSize },
        { label: "Incoterm", value: vars.incoterm },
        { label: "Target Price", value: `US$ ${vars.targetPrice}/kg`, bold: true },
        { label: "Shipment", value: vars.shipment },
      ])}
    `,
    ctaUrl: `https://app.mundustrade.us/supplier/requests/${vars.requestNumber}`,
    ctaLabel: "View Request & Create Offer →",
  }),

  bidReceived: (vars: { supplierName: string; buyerCompany: string; buyerCountry: string; buyerFlag: string; offerNumber: string; cutName: string; round: number; maxRounds: number; askingPrice: string; bidPrice: string; gap: string; gapPct: string; totalValue: string; destination: string; destFlag: string }) => masterLayout({
    heroTitle: "New Bid Received 💰",
    heroColor: "wine",
    preheader: `${vars.buyerCompany} bid US$ ${vars.totalValue} on M-${vars.offerNumber}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.supplierName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${vars.buyerCompany}</strong> has placed a bid on your offer.</p>
      ${dataCard([
        { label: "Offer", value: `M-${vars.offerNumber}` },
        { label: "Product", value: vars.cutName, bold: true },
        { label: "Round", value: `${vars.round} of ${vars.maxRounds}` },
      ])}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
        ${priceRow("Your Asking", `US$ ${vars.askingPrice}/kg`, "#1A1A2E")}
        ${priceRow("Buyer's Bid", `US$ ${vars.bidPrice}/kg`, "#DC2626")}
        ${priceRow("Gap", `US$ ${vars.gap}/kg (${vars.gapPct}%)`, "#D97706")}
        <tr><td colspan="2" style="border-top:1px solid #E5E7EB;"></td></tr>
        ${priceRow("Total Bid Value", `US$ ${vars.totalValue}`, "#1A1A2E")}
        ${priceRow("Buyer", `${vars.buyerFlag} ${vars.buyerCompany}`, "#6B7280")}
        ${priceRow("Destination", `${vars.destFlag} ${vars.destination}`, "#6B7280")}
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#6B7280;">You can counter, accept, or reject this bid.</p>
      <p style="margin:8px 0 0;font-size:13px;color:#D97706;font-weight:600;">⏰ Response needed</p>
    `,
    ctaUrl: `https://app.mundustrade.us/supplier/negotiations`,
    ctaLabel: "Review & Respond →",
  }),

  counterReceived: (vars: { buyerName: string; supplierCompany: string; offerNumber: string; cutName: string; round: number; maxRounds: number; askingPrice: string; yourBid: string; counterPrice: string; gap: string; gapPct: string; totalValue: string; isLastRound: boolean }) => masterLayout({
    heroTitle: "Counter Offer Received",
    heroColor: "wine",
    preheader: `${vars.supplierCompany} countered at US$ ${vars.counterPrice}/kg — Round ${vars.round}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.buyerName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${vars.supplierCompany}</strong> has responded to your bid with a counter offer.</p>
      ${dataCard([
        { label: "Offer", value: `M-${vars.offerNumber}` },
        { label: "Product", value: vars.cutName, bold: true },
        { label: "Round", value: `${vars.round} of ${vars.maxRounds}` },
      ])}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
        ${priceRow("Original Ask", `US$ ${vars.askingPrice}/kg`, "#6B7280")}
        ${priceRow("Your Last Bid", `US$ ${vars.yourBid}/kg`, "#DC2626")}
        ${priceRow("Their Counter", `US$ ${vars.counterPrice}/kg`, "#059669")}
        ${priceRow("Gap", `US$ ${vars.gap}/kg (${vars.gapPct}%)`, "#D97706")}
        <tr><td colspan="2" style="border-top:1px solid #E5E7EB;"></td></tr>
        ${priceRow("Counter Total", `US$ ${vars.totalValue}`, "#1A1A2E")}
      </table>
      ${vars.isLastRound ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;">
        <tr>
          <td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#92400E;font-weight:600;">
            ⚠️ Final Round — You can accept, reject, or send a message to the supplier.
          </td>
        </tr>
      </table>` : ""}
    `,
    ctaUrl: `https://app.mundustrade.us/buyer/negotiations`,
    ctaLabel: "Review & Respond →",
  }),

  dealClosed: (vars: { name: string; cutName: string; offerNumber: string; quantity: string; rounds: number; askingPrice: string; finalPrice: string; movementPct: string; totalValue: string; incoterm: string; origin: string; originFlag: string; destination: string; destFlag: string; shipment: string; supplierCompany: string; buyerCompany: string; advancePct: string; advanceAmount: string }) => masterLayout({
    heroTitle: "Deal Closed! 🎉",
    heroColor: "green",
    preheader: `Deal closed! M-${vars.offerNumber} — ${vars.cutName} — US$ ${vars.totalValue}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Congratulations <strong>${vars.name}</strong>!</p>
      <p style="margin:0 0 16px;">The negotiation for <strong>${vars.cutName}</strong> has been successfully closed.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;">
        <tr>
          <td style="padding:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#065F46;">✅ DEAL CONFIRMED</p>
            <p style="margin:0;font-size:28px;font-weight:800;color:#059669;">US$ ${vars.totalValue}</p>
          </td>
        </tr>
      </table>
      ${dataCard([
        { label: "Offer", value: `M-${vars.offerNumber}` },
        { label: "Product", value: vars.cutName, bold: true },
        { label: "Quantity", value: `${vars.quantity} kg` },
        { label: "Rounds", value: `${vars.rounds} negotiation rounds` },
        { label: "Original Ask", value: `US$ ${vars.askingPrice}/kg` },
        { label: "Final Price", value: `US$ ${vars.finalPrice}/kg`, bold: true },
        { label: "Movement", value: `${vars.movementPct}%` },
        { label: "Incoterm", value: vars.incoterm },
        { label: "Origin", value: `${vars.originFlag} ${vars.origin}` },
        { label: "Destination", value: `${vars.destFlag} ${vars.destination}` },
        { label: "Shipment", value: vars.shipment },
        { label: "Supplier", value: vars.supplierCompany },
        { label: "Buyer", value: vars.buyerCompany },
      ])}
      <p style="margin:20px 0 8px;font-weight:600;">Next steps:</p>
      <p style="margin:0 0 4px;">1. Order confirmation will be generated</p>
      <p style="margin:0 0 4px;">2. Advance payment (${vars.advancePct}%) of US$ ${vars.advanceAmount} is due</p>
      <p style="margin:0 0 4px;">3. Shipping details will follow</p>
    `,
    ctaUrl: `https://app.mundustrade.us`,
    ctaLabel: "View Deal Details →",
  }),

  dealAwaitingConfirmation: (vars: { name: string; cutName: string; offerNumber: string; totalValue: string; acceptedBy: "buyer" | "supplier"; counterpartyCompany: string; negotiationUrl: string }) => masterLayout({
    heroTitle: "Action required: confirm the deal",
    heroColor: "amber",
    preheader: `${vars.acceptedBy === "buyer" ? "Buyer" : "Supplier"} accepted M-${vars.offerNumber} — confirm to close.`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">The <strong>${vars.acceptedBy === "buyer" ? "buyer" : "supplier"}</strong> accepted the negotiation on <strong>${vars.cutName}</strong> (M-${vars.offerNumber}) at:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;">
        <tr>
          <td style="padding:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#92400E;">PROPOSED FINAL VALUE</p>
            <p style="margin:0;font-size:28px;font-weight:800;color:#B45309;">US$ ${vars.totalValue}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;">Review and click <strong>Confirm Deal</strong> on the negotiation page to officially close it and create the order.</p>
    `,
    ctaUrl: vars.negotiationUrl || `https://app.mundustrade.us`,
    ctaLabel: "Review & Confirm Deal →",
  }),

  negotiationRejected: (vars: { name: string; cutName: string; offerNumber: string; lastBid: string; lastCounter: string; gap: string; gapPct: string; rounds: number; reason?: string }) => masterLayout({
    heroTitle: "Negotiation Ended",
    heroColor: "gray",
    preheader: `Negotiation ended for M-${vars.offerNumber}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">The negotiation for <strong>${vars.cutName}</strong> (M-${vars.offerNumber}) has ended.</p>
      ${vars.reason ? `<p style="margin:0 0 16px;padding:12px 16px;background-color:#F3F4F6;border-radius:8px;font-style:italic;color:#374151;">Reason: "${vars.reason}"</p>` : ""}
      ${dataCard([
        { label: "Last bid", value: `US$ ${vars.lastBid}/kg` },
        { label: "Last counter", value: `US$ ${vars.lastCounter}/kg` },
        { label: "Gap", value: `US$ ${vars.gap}/kg (${vars.gapPct}%)` },
        { label: "Rounds completed", value: String(vars.rounds) },
      ])}
      <p style="margin:16px 0 0;color:#6B7280;">Don't worry — there are other opportunities on the marketplace.</p>
    `,
    ctaUrl: "https://app.mundustrade.us",
    ctaLabel: "Browse Offers →",
  }),

  orderStatusUpdate: (vars: { name: string; offerNumber: string; cutName: string; quantity: string; totalValue: string; statusLabel: string; statusMessage: string; statusStep: number }) => {
    const steps = ["Confirmed", "Payment", "Shipping", "Delivered"];
    const progressHtml = steps.map((s, i) => {
      const active = i <= vars.statusStep;
      const current = i === vars.statusStep;
      return `<td style="text-align:center;padding:4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${active ? '#059669' : '#9CA3AF'};font-weight:${current ? '700' : '400'};">
        <div style="width:24px;height:24px;border-radius:50%;background:${active ? '#059669' : '#E5E7EB'};color:${active ? '#fff' : '#9CA3AF'};line-height:24px;text-align:center;margin:0 auto 4px;font-size:12px;font-weight:700;">${active ? '✓' : i + 1}</div>
        ${s}
      </td>`;
    }).join("");

    return masterLayout({
      heroTitle: "Order Update",
      heroColor: "wine",
      preheader: `Order M-${vars.offerNumber} — ${vars.statusLabel}`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
        <p style="margin:0 0 16px;">Your order M-${vars.offerNumber} status has been updated.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;">
          <tr>
            <td style="padding:16px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1A1A2E;">📦 ${vars.statusLabel}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>${progressHtml}</tr></table>
            </td>
          </tr>
        </table>
        ${dataCard([
          { label: "Product", value: vars.cutName, bold: true },
          { label: "Quantity", value: `${vars.quantity} kg` },
          { label: "Value", value: `US$ ${vars.totalValue}` },
        ])}
        <p style="margin:16px 0 0;padding:12px 16px;background-color:#EFF6FF;border-radius:8px;font-size:14px;color:#1E40AF;">${vars.statusMessage}</p>
      `,
      ctaUrl: "https://app.mundustrade.us",
      ctaLabel: "View Order →",
    });
  },

  staleNudge: (vars: { name: string; cutName: string; offerNumber: string; round: number; maxRounds: number; waitingFor: string; hours: number; gap: string; gapPct: string; expiryDate: string }) => masterLayout({
    heroTitle: "⏰ Action Needed",
    heroColor: "amber",
    preheader: `Negotiation M-${vars.offerNumber} waiting for your response — ${vars.hours}h`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">Your negotiation for <strong>${vars.cutName}</strong> has been waiting for a response for <strong>${vars.hours} hours</strong>.</p>
      ${dataCard([
        { label: "Offer", value: `M-${vars.offerNumber}` },
        { label: "Round", value: `${vars.round} of ${vars.maxRounds}` },
        { label: "Status", value: `Awaiting your ${vars.waitingFor}` },
        { label: "Current gap", value: `US$ ${vars.gap}/kg (${vars.gapPct}%)` },
      ])}
      <p style="margin:16px 0 0;font-size:13px;color:#92400E;font-weight:600;">The offer expires on ${vars.expiryDate}. Don't miss this opportunity.</p>
    `,
    ctaUrl: "https://app.mundustrade.us",
    ctaLabel: "Respond Now →",
  }),

  offerShared: (vars: { senderName: string; senderCompany: string; cutName: string; origin: string; originFlag: string; quantity: string; priceFrom: string; incoterm: string; shipment: string; viewUrl: string }) => masterLayout({
    heroTitle: "You've Been Invited to View an Offer",
    heroColor: "wine",
    preheader: `${vars.senderName} shared a protein offer with you`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;"><strong>${vars.senderName}</strong> from <strong>${vars.senderCompany}</strong> has shared a protein offer with you on Mundus Trade.</p>
      ${dataCard([
        { label: "Product", value: `🥩 ${vars.cutName}`, bold: true },
        { label: "Origin", value: `${vars.originFlag} ${vars.origin}` },
        { label: "Quantity", value: `${vars.quantity} kg` },
        { label: "Price from", value: `US$ ${vars.priceFrom}/kg`, bold: true },
        { label: "Incoterm", value: vars.incoterm },
        { label: "Shipment", value: vars.shipment },
      ])}
      <p style="margin:16px 0 0;font-size:13px;color:#6B7280;">Don't have an account? <a href="https://app.mundustrade.us/signup" style="color:#8B2252;font-weight:600;">Register for free →</a></p>
    `,
    ctaUrl: vars.viewUrl,
    ctaLabel: "View Full Offer →",
  }),

  customerInvitation: (vars: { recipientName: string; inviterCompany: string; inviterName: string; inviterEmail: string }) => masterLayout({
    heroTitle: "You've Been Invited",
    heroColor: "wine",
    preheader: `${vars.inviterCompany} has invited you to Mundus Trade`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.recipientName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${vars.inviterCompany}</strong> has invited you to join Mundus Trade — the global B2B protein trading platform.</p>
      <p style="margin:20px 0 8px;font-weight:600;">As a registered member, you'll be able to:</p>
      <p style="margin:0 0 4px;">✅ Browse exclusive offers from verified suppliers</p>
      <p style="margin:0 0 4px;">✅ Negotiate directly with competitive pricing</p>
      <p style="margin:0 0 4px;">✅ Track orders and shipments in real-time</p>
      <p style="margin:0 0 4px;">✅ Access market intelligence and price data</p>
      <p style="margin:24px 0 0;font-size:13px;color:#6B7280;">This invitation was sent by ${vars.inviterName} (${vars.inviterEmail}).</p>
    `,
    ctaUrl: "https://app.mundustrade.us/signup",
    ctaLabel: "Accept Invitation & Register →",
  }),

  weeklyDigest: (vars: { name: string; dateRange: string; activeOffers: number; newBids: number; activeNegos: number; dealsClosed: number; revenue: string; marketHighlight: string; topOffers: Array<{ cut: string; price: string; country: string }> }) => masterLayout({
    heroTitle: "Your Weekly Digest 📊",
    heroColor: "wine",
    preheader: `Mundus Trade weekly digest — ${vars.dateRange}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${vars.name}</strong>,</p>
      <p style="margin:0 0 16px;">Here's what happened on Mundus Trade this week.</p>
      ${dataCard([
        { label: "Active offers", value: String(vars.activeOffers) },
        { label: "New bids received", value: String(vars.newBids) },
        { label: "Negotiations active", value: String(vars.activeNegos) },
        { label: "Deals closed", value: String(vars.dealsClosed), bold: true },
        { label: "Revenue this week", value: `US$ ${vars.revenue}`, bold: true },
      ])}
      <p style="margin:20px 0 8px;font-weight:600;">📈 Market Highlights</p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">${vars.marketHighlight}</p>
      <p style="margin:20px 0 8px;font-weight:600;">🔥 Top Offers This Week</p>
      ${vars.topOffers.map((o, i) => `
        <p style="margin:0 0 4px;font-size:14px;">${i + 1}. <strong>${o.cut}</strong> — US$ ${o.price}/kg from ${o.country}</p>
      `).join("")}
    `,
    ctaUrl: "https://app.mundustrade.us",
    ctaLabel: "View Marketplace →",
  }),

  publicLeadCaptured: (vars: {
    email: string;
    name?: string;
    company?: string;
    phone?: string;
    country?: string;
    protein?: string;
    leadType?: string;
    mundusRep?: string;
    lang?: string;
  }) => masterLayout({
    heroTitle: "New public-home lead 🌎",
    heroColor: "green",
    preheader: `New lead from public home — ${vars.email}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">A new lead was captured from the public homepage.</p>
      ${dataCard([
        { label: "Email", value: vars.email, bold: true },
        { label: "Name", value: vars.name || "—" },
        { label: "Company", value: vars.company || "—" },
        { label: "Phone", value: vars.phone || "—" },
        { label: "Country", value: vars.country || "—" },
        { label: "Interest (protein)", value: vars.protein || "—" },
        { label: "Lead type", value: vars.leadType || "—" },
        { label: "Assigned Mundus rep", value: vars.mundusRep || "—", bold: true },
        { label: "Language", value: vars.lang || "en" },
      ])}
      <p style="margin:20px 0 0;font-size:13px;color:#6B7280;">The contact has been created in the CRM. Please follow up within 1 business day.</p>
    `,
    ctaUrl: "https://app.mundustrade.us/admin/crm/prospects",
    ctaLabel: "Open CRM →",
  }),

  scl_invite_existing: (vars: { supplier: string; recipientName?: string }) => masterLayout({
    heroTitle: `You've been invited by ${vars.supplier}`,
    heroColor: "wine",
    preheader: `${vars.supplier} has added you as a customer on Mundus Trade`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi${vars.recipientName ? ` <strong>${vars.recipientName}</strong>` : ""},</p>
      <p style="margin:0 0 16px;"><strong>${vars.supplier}</strong> has invited you to connect with them on Mundus Trade as one of their customers.</p>
      <p style="margin:0 0 16px;">Once you accept, you'll start receiving offers tailored to your relationship — including offers shared only with their network.</p>
    `,
    ctaUrl: "https://app.mundustrade.us/buyer/connected-suppliers",
    ctaLabel: "Review invitation →",
  }),

  scl_invite_signup: (vars: { supplier: string; linkId?: string }) => masterLayout({
    heroTitle: `${vars.supplier} invited you to Mundus Trade`,
    heroColor: "wine",
    preheader: `${vars.supplier} wants to connect with you on Mundus Trade`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi there,</p>
      <p style="margin:0 0 16px;"><strong>${vars.supplier}</strong> has invited you to join Mundus Trade — the global B2B protein trading platform — as one of their customers.</p>
      <p style="margin:0 0 16px;">Sign up to start receiving direct offers and access the wider marketplace.</p>
    `,
    ctaUrl: `https://app.mundustrade.us/signup${vars.linkId ? `?invite=${vars.linkId}` : ""}`,
    ctaLabel: "Create your account →",
  }),

  scl_direct_offer: (vars: { supplier: string; offerTitle: string; offerId: string }) => masterLayout({
    heroTitle: `Direct offer from ${vars.supplier}`,
    heroColor: "wine",
    preheader: `${vars.supplier} sent you a direct offer: ${vars.offerTitle}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;"><strong>${vars.supplier}</strong> published a new offer targeted specifically to you:</p>
      <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#8B2252;">${vars.offerTitle}</p>
      <p style="margin:0 0 16px;">Open the offer to review prices, terms and place a bid.</p>
    `,
    ctaUrl: `https://app.mundustrade.us/buyer/offers/${vars.offerId}`,
    ctaLabel: "View offer →",
  }),

  scl_all_customers_offer: (vars: { supplier: string; offerTitle: string; offerId: string }) => masterLayout({
    heroTitle: `New offer from ${vars.supplier}`,
    heroColor: "wine",
    preheader: `${vars.supplier} shared a new offer with their customers`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi,</p>
      <p style="margin:0 0 16px;"><strong>${vars.supplier}</strong> just published a new offer to their network:</p>
      <p style="margin:0 0 16px;font-size:17px;font-weight:600;color:#8B2252;">${vars.offerTitle}</p>
      <p style="margin:0 0 16px;">As one of their connected customers, you have early access.</p>
    `,
    ctaUrl: `https://app.mundustrade.us/buyer/offers/${vars.offerId}`,
    ctaLabel: "View offer →",
  }),
};

export type EmailTemplateName = keyof typeof emailTemplates;

export const emailSubjects: Record<EmailTemplateName, (vars: any) => string> = {
  welcome: (v) => `Welcome to Mundus Trade, ${v.name}! 🎉`,
  passwordReset: () => "Reset your Mundus Trade password",
  newOffer: (v) => `New Offer: ${v.cutName} from ${v.origin} — M-${v.offerNumber}`,
  newRequest: (v) => `New Request: ${v.productName} to ${v.destination} — R-${v.requestNumber}`,
  bidReceived: (v) => `New Bid on M-${v.offerNumber}: ${v.cutName} — US$ ${v.totalValue}`,
  counterReceived: (v) => `Counter Offer on M-${v.offerNumber}: ${v.cutName} — Round ${v.round}`,
  dealClosed: (v) => `🎉 Deal Closed! M-${v.offerNumber} — US$ ${v.totalValue}`,
  dealAwaitingConfirmation: (v) => `⏳ Action required: confirm M-${v.offerNumber} (US$ ${v.totalValue})`,
  negotiationRejected: (v) => `Negotiation Ended — M-${v.offerNumber}`,
  orderStatusUpdate: (v) => `Order Update: M-${v.offerNumber} — ${v.statusLabel}`,
  staleNudge: (v) => `⏰ Negotiation waiting — M-${v.offerNumber}`,
  offerShared: (v) => `${v.senderName} shared an offer with you`,
  customerInvitation: (v) => `${v.inviterCompany} has invited you to Mundus Trade`,
  weeklyDigest: (v) => `Your Mundus Trade Weekly Digest — ${v.dateRange}`,
  publicLeadCaptured: (v) => `New public-home lead — ${v.email}`,
  scl_invite_existing: (v) => `You've been invited by ${v.supplier} on Mundus Trade`,
  scl_invite_signup: (v) => `You've been invited to join Mundus Trade by ${v.supplier}`,
  scl_direct_offer: (v) => `Direct offer from ${v.supplier}: ${v.offerTitle}`,
  scl_all_customers_offer: (v) => `New offer from ${v.supplier}: ${v.offerTitle}`,
};