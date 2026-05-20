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
  { id: "c2", name: "BRF S.A.", domain: "brf-global.com", industry: "Food & Beverage", country: "Brazil", countryFlag: "🇧🇷", city: "Itajaí", employees: 90000, employeeRange: "10001+", revenue: 11000000000, founded: 2009, description: "Global food company specializing in poultry and processed foods.", website: "https://brf-global.com", linkedin: "https://linkedin.com/company/brf", logo_url: logo("BRF"), stage: "customer", in_crm: true, keywords: ["poultry","halal","frozen meat"] },
  { id: "c3", name: "Marfrig Global Foods", domain: "marfrig.com.br", industry: "Meat Processing", country: "Brazil", countryFlag: "🇧🇷", city: "São Paulo", employees: 32000, employeeRange: "10001+", revenue: 15000000000, founded: 2000, description: "Beef-focused global protein company.", website: "https://marfrig.com.br", linkedin: "https://linkedin.com/company/marfrig", logo_url: logo("MAR"), stage: "warm", in_crm: true, keywords: ["beef"] },
  { id: "c4", name: "Minerva Foods", domain: "minervafoods.com", industry: "Meat Processing", country: "Brazil", countryFlag: "🇧🇷", city: "Barretos", employees: 18000, employeeRange: "10001+", revenue: 6200000000, founded: 1992, description: "South American beef exporter.", website: "https://minervafoods.com", linkedin: "https://linkedin.com/company/minerva-foods", logo_url: logo("MIN"), stage: "engaged", in_crm: true, keywords: ["beef","export"] },
  { id: "c5", name: "Tyson Foods", domain: "tysonfoods.com", industry: "Food & Beverage", country: "United States", countryFlag: "🇺🇸", city: "Springdale", employees: 142000, employeeRange: "10001+", revenue: 53000000000, founded: 1935, description: "Largest US meat producer.", website: "https://tysonfoods.com", linkedin: "https://linkedin.com/company/tyson-foods", logo_url: logo("TYS"), stage: null, in_crm: false },
  { id: "c6", name: "Cargill", domain: "cargill.com", industry: "Agriculture", country: "United States", countryFlag: "🇺🇸", city: "Minneapolis", employees: 160000, employeeRange: "10001+", revenue: 165000000000, founded: 1865, description: "Global food, agriculture, and industrial conglomerate.", website: "https://cargill.com", linkedin: "https://linkedin.com/company/cargill", logo_url: logo("CAR"), stage: "mql", in_crm: true },
  { id: "c7", name: "National Beef", domain: "nationalbeef.com", industry: "Meat Processing", country: "United States", countryFlag: "🇺🇸", city: "Kansas City", employees: 8500, employeeRange: "5001-10000", revenue: 11000000000, founded: 1992, description: "US beef processor.", website: "https://nationalbeef.com", linkedin: "https://linkedin.com/company/national-beef", logo_url: logo("NAT"), stage: null, in_crm: false },
  { id: "c8", name: "Smithfield Foods", domain: "smithfieldfoods.com", industry: "Meat Processing", country: "United States", countryFlag: "🇺🇸", city: "Smithfield", employees: 60000, employeeRange: "10001+", revenue: 14000000000, founded: 1936, description: "World's largest pork producer.", website: "https://smithfieldfoods.com", linkedin: "https://linkedin.com/company/smithfield-foods", logo_url: logo("SMI"), stage: null, in_crm: false, keywords: ["pork"] },
  { id: "c9", name: "Danish Crown", domain: "danishcrown.com", industry: "Meat Processing", country: "Denmark", countryFlag: "🇩🇰", city: "Randers", employees: 26000, employeeRange: "10001+", revenue: 9500000000, founded: 1887, description: "European pork & beef cooperative.", website: "https://danishcrown.com", linkedin: "https://linkedin.com/company/danish-crown", logo_url: logo("DAN"), stage: "sql", in_crm: true, keywords: ["pork","beef","export"] },
  { id: "c10", name: "Vion Food Group", domain: "vionfoodgroup.com", industry: "Meat Processing", country: "Netherlands", countryFlag: "🇳🇱", city: "Boxtel", employees: 12000, employeeRange: "10001+", revenue: 5200000000, founded: 1968, description: "Dutch international pork and beef producer.", website: "https://vionfoodgroup.com", linkedin: "https://linkedin.com/company/vion-food-group", logo_url: logo("VIO"), stage: null, in_crm: false },
  { id: "c11", name: "NH Foods", domain: "nipponham.co.jp", industry: "Food & Beverage", country: "Japan", countryFlag: "🇯🇵", city: "Osaka", employees: 30000, employeeRange: "10001+", revenue: 8900000000, founded: 1942, description: "Japanese meat and processed food giant.", website: "https://nipponham.co.jp", linkedin: "https://linkedin.com/company/nh-foods", logo_url: logo("NHF"), stage: "cold", in_crm: true },
  { id: "c12", name: "WH Group", domain: "wh-group.com", industry: "Meat Processing", country: "Hong Kong", countryFlag: "🇭🇰", city: "Hong Kong", employees: 100000, employeeRange: "10001+", revenue: 28000000000, founded: 1958, description: "World's largest pork company (parent of Smithfield).", website: "https://wh-group.com", linkedin: "https://linkedin.com/company/wh-group", logo_url: logo("WHG"), stage: null, in_crm: false, keywords: ["pork"] },
  { id: "c13", name: "Hormel Foods", domain: "hormelfoods.com", industry: "Food & Beverage", country: "United States", countryFlag: "🇺🇸", city: "Austin", employees: 20000, employeeRange: "10001+", revenue: 12100000000, founded: 1891, description: "US branded food and meat company.", website: "https://hormelfoods.com", linkedin: "https://linkedin.com/company/hormel-foods", logo_url: logo("HOR"), stage: null, in_crm: false },
  { id: "c14", name: "Pilgrim's Pride", domain: "pilgrims.com", industry: "Food & Beverage", country: "United States", countryFlag: "🇺🇸", city: "Greeley", employees: 61000, employeeRange: "10001+", revenue: 17500000000, founded: 1946, description: "Global poultry producer.", website: "https://pilgrims.com", linkedin: "https://linkedin.com/company/pilgrims", logo_url: logo("PIL"), stage: "engaged", in_crm: true, keywords: ["poultry"] },
  { id: "c15", name: "Perdue Farms", domain: "perduefarms.com", industry: "Food & Beverage", country: "United States", countryFlag: "🇺🇸", city: "Salisbury", employees: 22000, employeeRange: "10001+", revenue: 8000000000, founded: 1920, description: "US poultry and grain company.", website: "https://perduefarms.com", linkedin: "https://linkedin.com/company/perdue-farms", logo_url: logo("PER"), stage: null, in_crm: false, keywords: ["poultry","organic meat"] },
  { id: "c16", name: "Maple Leaf Foods", domain: "mapleleaffoods.com", industry: "Food & Beverage", country: "Canada", countryFlag: "🇨🇦", city: "Mississauga", employees: 13500, employeeRange: "10001+", revenue: 3700000000, founded: 1991, description: "Canadian consumer packaged meats.", website: "https://mapleleaffoods.com", linkedin: "https://linkedin.com/company/maple-leaf-foods", logo_url: logo("MLF"), stage: null, in_crm: false },
  { id: "c17", name: "OSI Group", domain: "osigroup.com", industry: "Food Distribution", country: "United States", countryFlag: "🇺🇸", city: "Aurora", employees: 20000, employeeRange: "10001+", revenue: 7200000000, founded: 1909, description: "Global custom food supplier.", website: "https://osigroup.com", linkedin: "https://linkedin.com/company/osi-group", logo_url: logo("OSI"), stage: "warm", in_crm: true },
  { id: "c18", name: "Sigma Alimentos", domain: "sigma-alimentos.com", industry: "Food & Beverage", country: "Mexico", countryFlag: "🇲🇽", city: "Monterrey", employees: 45000, employeeRange: "10001+", revenue: 7600000000, founded: 1980, description: "Mexican refrigerated foods company.", website: "https://sigma-alimentos.com", linkedin: "https://linkedin.com/company/sigma-alimentos", logo_url: logo("SIG"), stage: null, in_crm: false },
  { id: "c19", name: "COFCO Meat", domain: "cofco.com", industry: "Meat Processing", country: "China", countryFlag: "🇨🇳", city: "Beijing", employees: 8000, employeeRange: "5001-10000", revenue: 1800000000, founded: 2009, description: "Chinese state-owned pork producer.", website: "https://cofco.com", linkedin: "https://linkedin.com/company/cofco", logo_url: logo("COF"), stage: "cold", in_crm: true, keywords: ["pork","import"] },
  { id: "c20", name: "Al Kabeer Group", domain: "alkabeer.com", industry: "Food Distribution", country: "United Arab Emirates", countryFlag: "🇦🇪", city: "Sharjah", employees: 1500, employeeRange: "1001-5000", revenue: 320000000, founded: 1974, description: "Middle East frozen halal foods.", website: "https://alkabeer.com", linkedin: "https://linkedin.com/company/al-kabeer", logo_url: logo("AKB"), stage: "engaged", in_crm: true, keywords: ["halal","frozen meat"] },
  { id: "c21", name: "Al Safi Danone", domain: "alsafidanone.com", industry: "Food & Beverage", country: "Saudi Arabia", countryFlag: "🇸🇦", city: "Riyadh", employees: 2800, employeeRange: "1001-5000", revenue: 540000000, founded: 1979, description: "Saudi dairy and food company.", website: "https://alsafidanone.com", linkedin: "https://linkedin.com/company/al-safi-danone", logo_url: logo("ALS"), stage: null, in_crm: false },
  { id: "c22", name: "Namet Gıda", domain: "namet.com.tr", industry: "Meat Processing", country: "Turkey", countryFlag: "🇹🇷", city: "Istanbul", employees: 1200, employeeRange: "1001-5000", revenue: 280000000, founded: 1974, description: "Turkish red meat and processed foods.", website: "https://namet.com.tr", linkedin: "https://linkedin.com/company/namet", logo_url: logo("NAM"), stage: null, in_crm: false, keywords: ["halal","beef"] },
  { id: "c23", name: "Doux SA", domain: "doux.com", industry: "Food & Beverage", country: "France", countryFlag: "🇫🇷", city: "Châteaulin", employees: 2300, employeeRange: "1001-5000", revenue: 420000000, founded: 1933, description: "French poultry exporter.", website: "https://doux.com", linkedin: "https://linkedin.com/company/doux", logo_url: logo("DOU"), stage: null, in_crm: false, keywords: ["poultry","export"] },
  { id: "c24", name: "Americana Group", domain: "americana-group.com", industry: "Hospitality/Hotels", country: "United Arab Emirates", countryFlag: "🇦🇪", city: "Dubai", employees: 50000, employeeRange: "10001+", revenue: 2100000000, founded: 1964, description: "MENA's largest food operator (KFC, Pizza Hut franchises).", website: "https://americana-group.com", linkedin: "https://linkedin.com/company/americana", logo_url: logo("AME"), stage: "mql", in_crm: true, keywords: ["frozen meat","poultry"] },
  { id: "c25", name: "San Miguel Food", domain: "sanmiguelfood.com.ph", industry: "Food & Beverage", country: "Philippines", countryFlag: "🇵🇭", city: "Mandaluyong", employees: 25000, employeeRange: "10001+", revenue: 5100000000, founded: 1953, description: "Philippines' leading food and beverage company.", website: "https://sanmiguelfood.com.ph", linkedin: "https://linkedin.com/company/san-miguel-food", logo_url: logo("SMF"), stage: null, in_crm: false, keywords: ["poultry","pork"] },
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
  mkPerson("p2","Ana","Silva","Export Manager","c1","Manager","Sales",{ in_crm:true, emailStatus:"verified" }),
  mkPerson("p3","Pedro","Costa","Head of Sourcing","c2","Director","Purchasing",{ phoneAvailable:true, mobileAvailable:true }),
  mkPerson("p4","Mariana","Rocha","Commercial Director","c3","Director","Sales",{ in_crm:true }),
  mkPerson("p5","João","Almeida","VP of Operations","c4","VP","Operations",{ mobileAvailable:true }),
  mkPerson("p6","Michael","Johnson","Chief Procurement Officer","c5","C-Level","Purchasing",{ emailStatus:"verified", phoneAvailable:true }),
  mkPerson("p7","Sarah","Williams","Supply Chain Manager","c5","Manager","Operations",{ emailStatus:"unverified" }),
  mkPerson("p8","David","Chen","Import Manager","c6","Manager","Purchasing",{ in_crm:true, mobileAvailable:true }),
  mkPerson("p9","Emily","Brown","Category Manager - Meat","c6","Manager","Purchasing",{ emailStatus:"verified" }),
  mkPerson("p10","Robert","Davis","Director of Trade","c7","Director","Operations",{ emailStatus:"unverified", phoneAvailable:false }),
  mkPerson("p11","Jennifer","Miller","VP Procurement","c8","VP","Purchasing",{ in_crm:true, productsOfInterest:["Pork"] }),
  mkPerson("p12","Lars","Nielsen","Export Director","c9","Director","Sales",{ emailStatus:"verified", mobileAvailable:true }),
  mkPerson("p13","Mette","Hansen","Purchasing Manager","c9","Manager","Purchasing"),
  mkPerson("p14","Jan","de Vries","Head of Logistics","c10","Director","Logistics",{ emailStatus:"unavailable", email:null }),
  mkPerson("p15","Hiroshi","Tanaka","Import Manager","c11","Manager","Purchasing",{ in_crm:true, productsOfInterest:["Beef"] }),
  mkPerson("p16","Yuki","Sato","Buyer","c11","Senior","Purchasing"),
  mkPerson("p17","Wei","Zhang","CEO","c12","C-Level","Executive",{ phoneAvailable:true, mobileAvailable:true }),
  mkPerson("p18","Lisa","Anderson","Senior Buyer","c13","Senior","Purchasing",{ emailStatus:"verified" }),
  mkPerson("p19","James","Wilson","Trade Manager","c14","Manager","Sales",{ in_crm:true }),
  mkPerson("p20","Karen","Thompson","Logistics Director","c15","Director","Logistics",{ emailStatus:"unverified" }),
  mkPerson("p21","Patrick","Moore","COO","c16","C-Level","Operations",{ mobileAvailable:true }),
  mkPerson("p22","Brian","Taylor","Procurement Manager","c17","Manager","Purchasing",{ in_crm:true }),
  mkPerson("p23","Carlos","García","Buyer","c18","Senior","Purchasing"),
  mkPerson("p24","Liu","Yang","Import Director","c19","Director","Purchasing",{ in_crm:true, mobileAvailable:true, productsOfInterest:["Pork"] }),
  mkPerson("p25","Ahmed","Al-Rashid","Head of Procurement","c20","Director","Purchasing",{ in_crm:true, emailStatus:"verified", phoneAvailable:true, mobileAvailable:true, productsOfInterest:["Halal","Beef","Poultry"] }),
];

export const EMPLOYEE_RANGES = ["1-10","11-50","51-200","201-500","501-1000","1001-5000","5001-10000","10001+"];
export const STAGES = ["cold","engaged","warm","mql","sql","customer","churned"] as const;
export const COUNTRIES = ["China","United Arab Emirates","Saudi Arabia","Brazil","Argentina","Egypt","Hong Kong","Philippines","United States","Japan","Denmark","Netherlands","Canada","Mexico","Turkey","France"];
export const INDUSTRIES = ["Meat Processing","Food & Beverage","Wholesale","Import/Export","Retail","Food Distribution","Agriculture","Cold Chain Logistics","Hospitality/Hotels","Restaurant Chains"];
export const KEYWORDS = ["frozen meat","beef","halal","poultry","pork","lamb","organic meat","export","import"];
export const SENIORITIES = ["C-Level","VP","Director","Manager","Senior","Staff"];
export const DEPARTMENTS = ["Operations","Purchasing","Sales","Marketing","Logistics","Finance","Executive"];
export const JOB_TITLES = ["Procurement Manager","Purchasing Director","Import Manager","Export Manager","VP of Operations","Supply Chain Manager","Head of Sourcing","CEO","COO","Commercial Director","Trade Manager","Logistics Manager","Category Manager","Buyer"];

export const fmtRevenue = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1e3)}k`;
export const fmtNumber = (v: number) => v.toLocaleString("en-US");
export const fakePhone = (seed: string) => {
  const h = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return `+1 ${String(200 + (h % 700)).padStart(3,"0")}-${String(100 + (h % 900)).padStart(3,"0")}-${String(1000 + (h % 9000)).padStart(4,"0")}`;
};