import { useParams } from "react-router-dom";
import { DocumentCenter } from "@/components/companyDocuments/DocumentCenter";

export default function AdminCompanyDocuments() {
  const { companyId } = useParams<{ companyId: string }>();
  if (!companyId) return <div className="p-6 text-sm text-muted-foreground">Missing company id</div>;
  return <DocumentCenter companyId={companyId} canManage={true} />;
}