import { useIsMobile } from "@/hooks/use-mobile";
import SupplierCreateOfferV2Desktop from "./SupplierCreateOfferV2Desktop";
import SupplierCreateOfferV2Mobile from "./SupplierCreateOfferV2Mobile";

export default function SupplierCreateOfferV2() {
  const isMobile = useIsMobile();
  if (isMobile === undefined) return null;
  return isMobile ? <SupplierCreateOfferV2Mobile /> : <SupplierCreateOfferV2Desktop />;
}