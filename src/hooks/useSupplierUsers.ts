export type SupplierUser = {
  id: string;
  name: string;
  jobTitle: string;
  email: string;
  profileType:
    | "master_supplier"
    | "sales_trader"
    | "export_manager"
    | "quality_control"
    | "logistics";
  createdAt: string;
  lastLoginAt: string;
  status: "active" | "inactive";
};

const MOCK_USERS: SupplierUser[] = [
  { id: "u1", name: "Antonio Lima", jobTitle: "Sales Director", email: "antonio@wmsfoods.com", profileType: "master_supplier", createdAt: "2025-01-08", lastLoginAt: "2026-05-17T09:48:00Z", status: "active" },
  { id: "u2", name: "Beatriz Sales", jobTitle: "Sales Trader", email: "sales@wmsfoods.com", profileType: "sales_trader", createdAt: "2025-01-28", lastLoginAt: "2026-05-17T08:30:00Z", status: "active" },
  { id: "u3", name: "Carlos Export", jobTitle: "Export Manager", email: "export@wmsfoods.com", profileType: "export_manager", createdAt: "2025-02-15", lastLoginAt: "2026-05-16T18:11:00Z", status: "active" },
  { id: "u4", name: "Diana Quality", jobTitle: "QA & Compliance", email: "quality@wmsfoods.com", profileType: "quality_control", createdAt: "2025-03-02", lastLoginAt: "2026-05-15T14:23:00Z", status: "active" },
  { id: "u5", name: "Eduardo Logistics", jobTitle: "Logistics Lead", email: "logistics@wmsfoods.com", profileType: "logistics", createdAt: "2025-03-22", lastLoginAt: "2026-05-17T07:45:00Z", status: "active" },
];

export function useSupplierUsers() {
  return { data: MOCK_USERS, isLoading: false, error: null as null | Error };
}