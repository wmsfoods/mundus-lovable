import { BarChart3, LineChart, Globe, type LucideIcon } from "lucide-react";
import type { ProPlan } from "@/lib/proSubscription";
import { PRO_PRICE_MONTHLY } from "@/lib/proSubscription";

export type MundusIntelFeature = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  externalUrl?: string;
};

export type MundusIntelPackage = {
  key: string;
  name: string;
  tagline: string;
  plan: ProPlan;
  price: number;
  features: MundusIntelFeature[];
};

export function getSupplierPackages(): MundusIntelPackage[] {
  return [
    {
      key: "analytics",
      name: "Analytics Package",
      tagline: "Price benchmark, performance analytics and live market data — everything to price smarter.",
      plan: "supplier_pro",
      price: PRO_PRICE_MONTHLY.supplier_pro,
      features: [
        {
          key: "price-benchmark",
          label: "Price Benchmark",
          description: "Compare your prices against the market in real time.",
          icon: BarChart3,
          to: "/supplier/insights/price-benchmark",
        },
        {
          key: "analytics",
          label: "Analytics",
          description: "Conversion funnel, top products and buyer geography.",
          icon: LineChart,
          to: "/supplier/insights/analytics",
        },
        {
          key: "market-intelligence",
          label: "Market Intelligence",
          description: "Live external dashboard for US market trends.",
          icon: Globe,
          externalUrl: "https://market-us.mundustrade.com",
        },
      ],
    },
  ];
}

export function getBuyerPackages(): MundusIntelPackage[] {
  return [
    {
      key: "intelligence",
      name: "Intelligence Package",
      tagline: "Procurement intelligence and live market data to source smarter.",
      plan: "buyer_pro",
      price: PRO_PRICE_MONTHLY.buyer_pro,
      features: [
        {
          key: "procurement",
          label: "Procurement Intelligence",
          description: "Spend, savings, supplier mix and market alerts.",
          icon: BarChart3,
          to: "/buyer/procurement-intelligence",
        },
        {
          key: "market-intelligence",
          label: "Market Intelligence",
          description: "Live external dashboard for US market trends.",
          icon: Globe,
          externalUrl: "https://market-us.mundustrade.com",
        },
      ],
    },
  ];
}