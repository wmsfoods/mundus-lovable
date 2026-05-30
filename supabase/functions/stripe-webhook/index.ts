import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-12-18.acacia",
});
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig ?? "", webhookSecret);
  } catch (e) {
    console.error("invalid signature", e);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const company_id = s.metadata?.company_id;
        const plan = s.metadata?.plan;
        if (!company_id || !plan) break;
        const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (!subId || !customerId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSub(company_id, plan, customerId, sub);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const company_id = sub.metadata?.company_id;
        const plan = sub.metadata?.plan;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        if (!company_id || !plan) break;
        await upsertSub(company_id, plan, customerId, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await admin
          .from("company_subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
        if (!subId) break;
        await admin
          .from("company_subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("webhook handler error", event.type, e);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function upsertSub(
  company_id: string,
  plan: string,
  customerId: string,
  sub: Stripe.Subscription,
) {
  const priceId = sub.items.data[0]?.price?.id ?? null;
  await admin.from("company_subscriptions").upsert(
    {
      company_id,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan,
      status: sub.status,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    },
    { onConflict: "company_id" },
  );
}