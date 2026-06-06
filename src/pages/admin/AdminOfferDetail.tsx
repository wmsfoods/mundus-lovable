import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon, CopyIcon } from "@/components/icons";
import { Pencil, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOffer } from "@/hooks/useOffer";
import { useIsManagedSupplier } from "@/hooks/useIsManagedSupplier";
import { formatOfferNumber } from "@/lib/offerNumber";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { auditLog } from "@/lib/auditLog";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 14, color: "#111827" }}>{value ?? "—"}</span>
    </div>
  );
}

export default function AdminOfferDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { offer, loading, notFound, error } = useOffer(id);
  const { isManaged, loading: managedLoading } = useIsManagedSupplier(offer?.supplier_id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return <div className="adm-body"><div className="adm-panel" style={{ padding: 16 }}>Loading…</div></div>;
  }

  if (notFound || !offer) {
    return (
      <div className="adm-body">
        <div className="adm-panel" style={{ padding: 24 }}>
          <h3 style={{ margin: 0 }}>Offer not found</h3>
          <p style={{ color: "#6b7280", fontSize: 13 }}>{error ?? "This offer doesn't exist or has been removed."}</p>
          <button onClick={() => navigate("/admin/offers")} style={btnGhost}>
            <ArrowLeftIcon size={14} /> Back to all offers
          </button>
        </div>
      </div>
    );
  }

  const offerLabel = formatOfferNumber(offer.offer_number, offer.created_at);

  const handleEdit = () => {
    navigate(`/supplier/offers/new?id=${offer.id}&as_company=${offer.supplier_id}`);
  };
  const handleClone = () => {
    navigate(`/supplier/offers/new?clone=${offer.id}&as_company=${offer.supplier_id}`);
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error: delErr } = await supabase
        .from("offers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", offer.id);
      if (delErr) {
        toast.error(delErr.message || "Failed to delete offer");
        return;
      }
      auditLog({
        action: "offer.deleted",
        category: "offer",
        entityType: "offer",
        entityId: offer.id,
        entityLabel: offerLabel,
        details: { adminAction: true, supplierId: offer.supplier_id },
        severity: "warn",
      });
      toast.success("Offer deleted.");
      navigate("/admin/offers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleToggleStatus = async () => {
    const next = offer.status === "active" ? "inactive" : "active";
    const { error: upErr } = await supabase.from("offers").update({ status: next }).eq("id", offer.id);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success(`Offer set to ${next}.`);
    // simple refresh
    window.location.reload();
  };

  const destinations = (offer.markets ?? [])
    .map((m) => m.market?.country?.english_name)
    .filter(Boolean) as string[];

  return (
    <div className="adm-body">
      <div className="adm-page-header">
        <div>
          <button onClick={() => navigate("/admin/offers")} style={{ ...btnGhost, marginRight: 12 }}>
            <ArrowLeftIcon size={14} /> Back
          </button>
          <span className="adm-page-title">{offerLabel}</span>
          <span className="adm-page-subtle"> · {offer.supplier_name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => navigate(`/admin/companies/${offer.supplier_id}`)} style={btnGhost}>
            <ExternalLink size={12} style={{ marginRight: 4 }} /> Supplier
          </button>
        </div>
      </div>

      {!managedLoading && !isManaged && (
        <div className="adm-panel" style={{ padding: 12, background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#4b5563", fontSize: 13 }}>
          <AlertCircle size={14} style={{ display: "inline", marginRight: 6 }} />
          This supplier is self-managed. Admin edit/clone/delete actions are disabled.
        </div>
      )}

      {isManaged && (
        <div className="adm-panel" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={handleEdit} style={btnPrimary}>
            <Pencil size={12} style={{ marginRight: 6, display: "inline" }} /> Edit
          </button>
          <button type="button" onClick={handleClone} style={btnGhost}>
            <CopyIcon size={12} /> Clone
          </button>
          <button type="button" onClick={handleToggleStatus} style={btnGhost}>
            {offer.status === "active" ? "Deactivate" : "Activate"}
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)} style={btnDanger}>
            <Trash2 size={12} style={{ marginRight: 6, display: "inline" }} /> Delete
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="adm-panel" style={{ padding: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#8B2252" }}>Offer</h3>
          <Row label="Status" value={offer.status ?? "—"} />
          <Row label="Origin" value={`${offer.origin_country ?? "—"}${offer.origin_city ? " · " + offer.origin_city : ""}${offer.origin_port ? " · " + offer.origin_port : ""}`} />
          <Row label="Shipment" value={`${MONTHS[offer.shipment_month - 1] ?? offer.shipment_month}/${offer.shipment_year}`} />
          <Row label="Container" value={offer.container_size} />
          <Row label="Total FCL" value={offer.total_fcl ?? "—"} />
          <Row label="Payment terms" value={offer.payment_terms} />
          <Row label="Pricing incoterm" value={offer.primary_pricing_incoterm ?? "—"} />
          <Row label="Destinations" value={destinations.length ? destinations.join(", ") : "—"} />
          {offer.observation && <Row label="Observation" value={offer.observation} />}
        </div>

        <div className="adm-panel" style={{ padding: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#8B2252" }}>Items ({offer.items.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {offer.items.map((it) => (
              <div key={it.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{it.customer_product?.name ?? "Item"}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                  {it.amount} kg · USD {it.price?.toFixed?.(2) ?? it.price}/kg
                  {it.condition ? ` · ${it.condition}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete offer?</DialogTitle>
            <DialogDescription>
              This will soft-delete <b>{offerLabel}</b> from {offer.supplier_name}. It can be restored from Data Management.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", background: "white", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
};
const btnPrimary: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #8B2252", background: "#8B2252", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #b91c1c", background: "white", color: "#b91c1c", fontSize: 12, fontWeight: 600, cursor: "pointer",
};