// Types and constants for the prospect search module.
// Real data will come from the prospect-search edge function.

export type ProspectCompany = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  country: string;
  countryFlag: string;
  city: string;
  employees: number;
  employeeRange: string;
  revenue: number;
  founded: number;
  description: string;
  website: string;
  linkedin: string;
  logo_url: string;
  stage: "cold" | "engaged" | "warm" | "mql" | "sql" | "customer" | "churned" | null;
  in_crm: boolean;
  technologies?: string[];
  keywords?: string[];
};

export type ProspectPerson = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  email: string | null;
  emailStatus: "verified" | "unverified" | "unavailable";
  emailRevealed: boolean;
  phone: string | null;
  phoneAvailable: boolean;
  phoneRevealed: boolean;
  mobile: string | null;
  mobileAvailable: boolean;
  mobileRevealed: boolean;
  country: string;
  countryFlag: string;
  city: string;
  seniority: "C-Level" | "VP" | "Director" | "Manager" | "Senior" | "Staff";
  department: string;
  linkedin: string;
  whatsapp: string | null;
  in_crm: boolean;
  productsOfInterest?: string[];
};

// Back-compat aliases (older code imported these names)
export type MockCompany = ProspectCompany;
export type MockPerson = ProspectPerson;

export const EMPLOYEE_RANGES = ["1-10","11-50","51-200","201-500","501-1000","1001-5000","5001-10000","10001+"];
export const STAGES = ["cold","engaged","warm","mql","sql","customer","churned"] as const;
export const INDUSTRIES = ["Meat Processing","Food & Beverage","Wholesale","Import/Export","Retail","Food Distribution","Agriculture","Cold Chain Logistics","Hospitality/Hotels","Restaurant Chains"];
export const KEYWORDS = ["frozen meat","beef","halal","poultry","pork","lamb","organic meat","export","import"];
export const SENIORITIES = ["C-Level","VP","Director","Manager","Senior","Staff"];
export const DEPARTMENTS = ["Operations","Purchasing","Sales","Marketing","Logistics","Finance","Executive"];
export const JOB_TITLES = ["Procurement Manager","Purchasing Director","Import Manager","Export Manager","VP of Operations","Supply Chain Manager","Head of Sourcing","CEO","COO","Commercial Director","Trade Manager","Logistics Manager","Category Manager","Buyer"];

export const REGION_PRESETS: { label: string; countries: string[] }[] = [
  { label: "Asia Pacific", countries: ["China","Japan","Philippines","Hong Kong"] },
  { label: "Middle East & Africa", countries: ["United Arab Emirates","Saudi Arabia","Egypt","Turkey"] },
  { label: "Europe", countries: ["Denmark","Netherlands","France"] },
  { label: "Latin America", countries: ["Brazil","Argentina","Mexico","Colombia"] },
  { label: "North America", countries: ["United States","Canada"] },
];

export const SIC_CODES = [
  { code: "2011", label: "Meat Packing Plants" },
  { code: "2013", label: "Sausages & Prepared Meats" },
  { code: "2015", label: "Poultry Slaughtering & Processing" },
  { code: "5141", label: "Groceries — General Line" },
  { code: "5147", label: "Meats & Meat Products" },
  { code: "5149", label: "Groceries & Related Products NEC" },
];
export const NAICS_CODES = [
  { code: "311611", label: "Animal (except Poultry) Slaughtering" },
  { code: "311612", label: "Meat Processed from Carcasses" },
  { code: "311615", label: "Poultry Processing" },
  { code: "424470", label: "Meat & Meat Product Merchant Wholesalers" },
];
export const MARKET_SEGMENTS = ["B2B","B2C","B2B2C","E-commerce","D2C","Retail","Services","Consulting"];
export const DECISION_LEVELS = ["Decision Maker","Influencer","Gatekeeper","User","Champion"];

// Unified Lead Type values used by tabs, filters and SaveToCrmModal.
export const LEAD_TYPES = ["Buyer","Supplier","Buyer/Supplier","Prospect"] as const;
export type LeadType = typeof LEAD_TYPES[number];

export const PRODUCT_INTERESTS = ["Beef","Pork","Poultry","Lamb","Halal","Organic"];

export const fmtRevenue = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`;
export const fmtNumber = (v: number) => v.toLocaleString("en-US");
export const fakePhone = (seed: string) => {
  const h = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `+1 ${String(200 + (h % 700)).padStart(3,"0")}-${String(100 + (h % 900)).padStart(3,"0")}-${String(1000 + (h % 9000)).padStart(4,"0")}`;
};