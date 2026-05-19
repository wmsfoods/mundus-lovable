export type BuyerUser = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  profileType: "admin" | "buyer" | "viewer";
  createdAt: string;
  lastLoginAt: string;
  status: "active" | "inactive";
};

const MOCK_USERS: BuyerUser[] = [
  { id: "b1", name: "Min-Jun Park", jobTitle: "Head of Imports", email: "minjun@seoulwagyu.kr", profileType: "admin", createdAt: "2025-01-12", lastLoginAt: "2026-05-17T09:30:00Z", status: "active" },
  { id: "b2", name: "Hiroshi Tanaka", jobTitle: "Senior Buyer", email: "hiroshi@tokyopremium.jp", profileType: "buyer", createdAt: "2025-02-04", lastLoginAt: "2026-05-17T07:12:00Z", status: "active" },
  { id: "b3", name: "Mei Wong", jobTitle: "Procurement Manager", email: "mei@hkfoods.hk", profileType: "buyer", createdAt: "2025-02-22", lastLoginAt: "2026-05-16T19:48:00Z", status: "active" },
  { id: "b4", name: "Sarah Chen", jobTitle: "Trade Analyst", email: "sarah@hkfoods.hk", profileType: "viewer", createdAt: "2025-03-10", lastLoginAt: "2026-05-15T11:20:00Z", status: "active" },
  { id: "b5", name: "Ahmed Al-Rashid", jobTitle: "Imports Director", email: "ahmed@almadina.sa", profileType: "admin", createdAt: "2025-03-28", lastLoginAt: "2026-05-17T06:05:00Z", status: "active" },
];

export function useBuyerUsers() {
  return { data: MOCK_USERS, isLoading: false, error: null as null | Error };
}
