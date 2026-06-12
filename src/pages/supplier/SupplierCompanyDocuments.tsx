import { DocumentCenter } from "@/components/companyDocuments/DocumentCenter";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { Loader2 } from "lucide-react";

export default function SupplierCompanyDocuments() {
  const { company, loading } = useCurrentCompany();
  if (loading || !company) {
    return <div className="p-6 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }
  return <DocumentCenter companyId={company.id} canManage={true} />;
}