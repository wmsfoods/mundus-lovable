export type MockCompany = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  country: string;
  countryFlag: string;
  city: string;
  employees: number;
  employeeRange: string;
  revenue: number; // USD
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

const logo = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=B64769,791f3f,3b6d11,0c447c&textColor=ffffff`;

export const MOCK_COMPANIES: MockCompany[] = [
  { id: "c1", name: "JBS S.A.", domain: "jbs.com.br", industry: "Meat Processing", country: "Brazil", countryFlag: "🇧🇷", city: "São Paulo", employees: 250000, employeeRange: "10001+", revenue: 72600000000, founded: 1953, description: "World's largest meat processing company.", website: "https://jbs.com.br", linkedin: "https://linkedin.com/company/jbs", logo_url: logo("JBS"), stage: "customer", in_crm: true, keywords: ["beef","pork","poultry"] },
];

export type MockPerson = {
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

const byId = Object.fromEntries(MOCK_COMPANIES.map((c) => [c.id, c]));

const mkPerson = (
  id: string, first: string, last: string, title: string, companyId: string,
  seniority: MockPerson["seniority"], department: string,
  opts: Partial<MockPerson> = {},
): MockPerson => {
  const c = byId[companyId];
  return {
    id, firstName: first, lastName: last, fullName: `${first} ${last}`,
    jobTitle: title, companyId, companyName: c.name, companyLogo: c.logo_url,
    email: opts.email ?? `${first.toLowerCase()}.${last.toLowerCase()}@${c.domain}`,
    emailStatus: opts.emailStatus ?? "verified", emailRevealed: opts.emailRevealed ?? false,
    phone: opts.phone ?? null, phoneAvailable: opts.phoneAvailable ?? true, phoneRevealed: opts.phoneRevealed ?? false,
    mobile: opts.mobile ?? null, mobileAvailable: opts.mobileAvailable ?? false, mobileRevealed: opts.mobileRevealed ?? false,
    country: c.country, countryFlag: c.countryFlag, city: c.city,
    seniority, department,
    linkedin: `https://linkedin.com/in/${first.toLowerCase()}-${last.toLowerCase()}`,
    whatsapp: opts.whatsapp ?? null,
    in_crm: opts.in_crm ?? false,
    productsOfInterest: opts.productsOfInterest,
  };
};

export const MOCK_PEOPLE: MockPerson[] = [
  mkPerson("p1","Carlos","Mendes","Procurement Director","c1","Director","Purchasing",{ in_crm:true, phoneAvailable:true, mobileAvailable:true, productsOfInterest:["Beef","Pork"] }),
];

export const EMPLOYEE_RANGES = ["1-10","11-50","51-200","201-500","501-1000","1001-5000","5001-10000","10001+"];
export const STAGES = ["cold","engaged","warm","mql","sql","customer","churned"] as const;
export const COUNTRIES = ["China","United Arab Emirates","Saudi Arabia","Brazil","Argentina","Egypt","Hong Kong","Philippines","United States","Japan","Denmark","Netherlands","Canada","Mexico","Turkey","France"];
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
export const LEAD_TYPES = ["Buyer","Supplier","Both","Prospect"];
export const PRODUCT_INTERESTS = ["Beef","Pork","Poultry","Lamb","Halal","Organic"];

export const fmtRevenue = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`;
export const fmtNumber = (v: number) => v.toLocaleString("en-US");
export const fakePhone = (seed: string) => {
  const h = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `+1 ${String(200 + (h % 700)).padStart(3,"0")}-${String(100 + (h % 900)).padStart(3,"0")}-${String(1000 + (h % 9000)).padStart(4,"0")}`;
};