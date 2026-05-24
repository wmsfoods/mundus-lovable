import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import "@/styles/mundus-shipping-instructions.css";

type OrderData = {
  order_id?: string;
  order_number?: string;
  buyer_name?: string;
  buyer_address?: string;
  port_of_destination?: string;
  country_of_destination?: string;
  items?: { name: string; weight_kg: number }[];
};

const DOC_OPTIONS = [
  "Bill of Lading", "Weight List", "Origin Certificate", "Packing List",
  "Commercial Invoice", "Non-Wood Certificate", "Health Certificate",
  "Halal Certificate", "Kosher Certificate",
];

const SHIPPING_LINES = [
  "EVERGREEN", "COSCO", "YANG MING", "ZIM", "HAPAG-LLOYD",
  "CMA CGM", "ONE", "MSC", "MAERSK", "HMM", "PIL",
];

type FormState = {
  importer_reference: string;
  buyer_name: string;
  buyer_address: string;
  port_of_destination: string;
  country_of_destination: string;
  consignee_same_as_buyer: boolean;
  consignee_name: string;
  consignee_address: string;
  consignee_phone: string;
  consignee_fax: string;
  notify_same_as_consignee: boolean;
  notify_name: string;
  notify_address: string;
  notify_phone: string;
  notify_fax: string;
  doc_delivery_company: string;
  doc_delivery_address: string;
  doc_delivery_city: string;
  doc_delivery_state: string;
  doc_delivery_postal_code: string;
  doc_delivery_country: string;
  doc_delivery_contact_name: string;
  doc_delivery_contact_phone: string;
  documents_requested: string[];
  documents_other: string;
  telex_release: "" | "yes" | "no" | "upon_request";
  any_shipping_line: boolean;
  approved_shipping_lines: string[];
  observations: string;
};

const EMPTY: FormState = {
  importer_reference: "", buyer_name: "", buyer_address: "",
  port_of_destination: "", country_of_destination: "",
  consignee_same_as_buyer: false, consignee_name: "", consignee_address: "",
  consignee_phone: "", consignee_fax: "",
  notify_same_as_consignee: false, notify_name: "", notify_address: "",
  notify_phone: "", notify_fax: "",
  doc_delivery_company: "", doc_delivery_address: "", doc_delivery_city: "",
  doc_delivery_state: "", doc_delivery_postal_code: "", doc_delivery_country: "",
  doc_delivery_contact_name: "", doc_delivery_contact_phone: "",
  documents_requested: [], documents_other: "",
  telex_release: "",
  any_shipping_line: false, approved_shipping_lines: [],
  observations: "",
};

export default function ShippingInstructionsForm() {
  const { token = "" } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData>({});
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ order_number: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: invErr } = await supabase.functions.invoke("shipping-instructions-validate", {
          body: { token },
        });
        if (invErr) throw invErr;
        if (!data?.valid) { setError(data?.error || "invalid"); return; }
        if (data.already_submitted) {
          setSubmitted({ order_number: data.order_data?.order_number || "" });
          return;
        }
        const od: OrderData = data.order_data || {};
        setOrderData(od);
        setForm((f) => ({
          ...f,
          buyer_name: od.buyer_name || "",
          buyer_address: od.buyer_address || "",
          port_of_destination: od.port_of_destination || "",
          country_of_destination: od.country_of_destination || "",
        }));
      } catch (e) {
        setError(String((e as Error)?.message ?? e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleArr(field: "documents_requested" | "approved_shipping_lines", value: string) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((x) => x !== value) : [...f[field], value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.port_of_destination || !form.consignee_name || !form.telex_release) {
      alert("Please fill all required fields (*)");
      return;
    }
    setSubmitting(true);
    try {
      const docs = [...form.documents_requested];
      if (form.documents_other.trim()) docs.push(`Other: ${form.documents_other.trim()}`);
      const lines = form.any_shipping_line ? ["ANY"] : form.approved_shipping_lines;

      const consignee = form.consignee_same_as_buyer
        ? { consignee_name: form.buyer_name, consignee_address: form.buyer_address, consignee_phone: "", consignee_fax: "" }
        : { consignee_name: form.consignee_name, consignee_address: form.consignee_address, consignee_phone: form.consignee_phone, consignee_fax: form.consignee_fax };

      const notify = form.notify_same_as_consignee
        ? { notify_name: consignee.consignee_name, notify_address: consignee.consignee_address, notify_phone: consignee.consignee_phone, notify_fax: consignee.consignee_fax }
        : { notify_name: form.notify_name, notify_address: form.notify_address, notify_phone: form.notify_phone, notify_fax: form.notify_fax };

      const { data, error: invErr } = await supabase.functions.invoke("shipping-instructions-submit", {
        body: {
          token,
          order_number: orderData.order_number,
          importer_reference: form.importer_reference,
          buyer_name: form.buyer_name,
          buyer_address: form.buyer_address,
          port_of_destination: form.port_of_destination,
          country_of_destination: form.country_of_destination,
          ...consignee,
          notify_same_as_consignee: form.notify_same_as_consignee,
          ...notify,
          documents_requested: docs,
          telex_release: form.telex_release,
          approved_shipping_lines: lines,
          observations: form.observations,
          doc_delivery_company: form.doc_delivery_company,
          doc_delivery_address: form.doc_delivery_address,
          doc_delivery_city: form.doc_delivery_city,
          doc_delivery_state: form.doc_delivery_state,
          doc_delivery_postal_code: form.doc_delivery_postal_code,
          doc_delivery_country: form.doc_delivery_country,
          doc_delivery_contact_name: form.doc_delivery_contact_name,
          doc_delivery_contact_phone: form.doc_delivery_contact_phone,
        },
      });
      if (invErr) throw invErr;
      if (data?.error) throw new Error(data.error);
      setSubmitted({ order_number: data?.order_number || orderData.order_number || "" });
    } catch (e) {
      alert("Submission failed: " + String((e as Error)?.message ?? e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="si-page"><div className="si-card"><p>Loading…</p></div></div>;
  }
  if (error) {
    return (
      <div className="si-page">
        <header className="si-header"><Logo size="md" /><h1>Shipping Instructions</h1></header>
        <div className="si-card">
          <h2 className="si-error-title">Link Unavailable</h2>
          <p>This shipping instructions link is {error === "expired" ? "expired" : error === "inactive" ? "no longer active" : "invalid"}. Please contact your supplier to request a new link.</p>
        </div>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="si-page">
        <header className="si-header"><Logo size="md" /><h1>Shipping Instructions</h1></header>
        <div className="si-card si-success">
          <div className="si-check">✓</div>
          <h2>Shipping Instructions Submitted</h2>
          <p>Your shipping instructions for Order <strong>{submitted.order_number}</strong> have been received.</p>
          <p>The Mundus Trade team and your supplier will be notified.</p>
        </div>
        <footer className="si-footer">© {new Date().getFullYear()} Mundus Trade · Connecting global meat trade</footer>
      </div>
    );
  }

  return (
    <div className="si-page">
      <header className="si-header">
        <Logo size="md" />
        <h1>Shipping Instructions</h1>
      </header>

      <form className="si-form" onSubmit={handleSubmit}>
        {/* Order info */}
        <section className="si-card">
          <h2>Order Information</h2>
          <div className="si-grid-2">
            <Field label="Mundus Order Number" value={orderData.order_number || "—"} readOnly />
            <div className="si-field">
              <label>Importer Reference</label>
              <input value={form.importer_reference} onChange={(e) => patch("importer_reference", e.target.value)} placeholder="Your own reference" />
            </div>
          </div>
          {orderData.items && orderData.items.length > 0 && (
            <div className="si-products">
              <label>Products</label>
              <ul>
                {orderData.items.map((it, i) => (
                  <li key={i}><span>{it.name}</span><span>{new Intl.NumberFormat().format(it.weight_kg)} kg</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Buyer */}
        <section className="si-card">
          <h2>Buyer for Invoice</h2>
          <div className="si-grid-1">
            <div className="si-field">
              <label>Company Name</label>
              <input value={form.buyer_name} onChange={(e) => patch("buyer_name", e.target.value)} />
            </div>
            <div className="si-field">
              <label>Full Address</label>
              <textarea rows={2} value={form.buyer_address} onChange={(e) => patch("buyer_address", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Destination */}
        <section className="si-card">
          <h2>Shipping Info</h2>
          <div className="si-grid-2">
            <div className="si-field">
              <label>Port of Destination <span className="req">*</span></label>
              <input required value={form.port_of_destination} onChange={(e) => patch("port_of_destination", e.target.value)} />
            </div>
            <div className="si-field">
              <label>Country of Destination</label>
              <input value={form.country_of_destination} onChange={(e) => patch("country_of_destination", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Consignee */}
        <section className="si-card">
          <h2>Consignee for Documents</h2>
          <label className="si-check-row">
            <input type="checkbox" checked={form.consignee_same_as_buyer} onChange={(e) => patch("consignee_same_as_buyer", e.target.checked)} />
            Same as Buyer
          </label>
          {!form.consignee_same_as_buyer && (
            <div className="si-grid-2">
              <div className="si-field"><label>Company Name <span className="req">*</span></label>
                <input required value={form.consignee_name} onChange={(e) => patch("consignee_name", e.target.value)} /></div>
              <div className="si-field"><label>Phone</label>
                <input value={form.consignee_phone} onChange={(e) => patch("consignee_phone", e.target.value)} /></div>
              <div className="si-field si-span-2"><label>Full Address</label>
                <textarea rows={2} value={form.consignee_address} onChange={(e) => patch("consignee_address", e.target.value)} /></div>
              <div className="si-field"><label>Fax</label>
                <input value={form.consignee_fax} onChange={(e) => patch("consignee_fax", e.target.value)} /></div>
            </div>
          )}
          {form.consignee_same_as_buyer && (
            <input type="hidden" required value={form.buyer_name} onChange={() => patch("consignee_name", form.buyer_name)} />
          )}
        </section>

        {/* Notify */}
        <section className="si-card">
          <h2>BL Notify Party</h2>
          <label className="si-check-row">
            <input type="checkbox" checked={form.notify_same_as_consignee} onChange={(e) => patch("notify_same_as_consignee", e.target.checked)} />
            Same as Consignee
          </label>
          {!form.notify_same_as_consignee && (
            <div className="si-grid-2">
              <div className="si-field"><label>Company Name</label>
                <input value={form.notify_name} onChange={(e) => patch("notify_name", e.target.value)} /></div>
              <div className="si-field"><label>Phone</label>
                <input value={form.notify_phone} onChange={(e) => patch("notify_phone", e.target.value)} /></div>
              <div className="si-field si-span-2"><label>Full Address</label>
                <textarea rows={2} value={form.notify_address} onChange={(e) => patch("notify_address", e.target.value)} /></div>
              <div className="si-field"><label>Fax</label>
                <input value={form.notify_fax} onChange={(e) => patch("notify_fax", e.target.value)} /></div>
            </div>
          )}
        </section>

        {/* Doc Delivery */}
        <section className="si-card">
          <h2>Where to Send Original Documents</h2>
          <div className="si-grid-2">
            <div className="si-field"><label>Company</label>
              <input value={form.doc_delivery_company} onChange={(e) => patch("doc_delivery_company", e.target.value)} /></div>
            <div className="si-field"><label>Contact Name</label>
              <input value={form.doc_delivery_contact_name} onChange={(e) => patch("doc_delivery_contact_name", e.target.value)} /></div>
            <div className="si-field si-span-2"><label>Address</label>
              <input value={form.doc_delivery_address} onChange={(e) => patch("doc_delivery_address", e.target.value)} /></div>
            <div className="si-field"><label>City</label>
              <input value={form.doc_delivery_city} onChange={(e) => patch("doc_delivery_city", e.target.value)} /></div>
            <div className="si-field"><label>State</label>
              <input value={form.doc_delivery_state} onChange={(e) => patch("doc_delivery_state", e.target.value)} /></div>
            <div className="si-field"><label>Postal Code</label>
              <input value={form.doc_delivery_postal_code} onChange={(e) => patch("doc_delivery_postal_code", e.target.value)} /></div>
            <div className="si-field"><label>Country</label>
              <input value={form.doc_delivery_country} onChange={(e) => patch("doc_delivery_country", e.target.value)} /></div>
            <div className="si-field"><label>Contact Phone</label>
              <input value={form.doc_delivery_contact_phone} onChange={(e) => patch("doc_delivery_contact_phone", e.target.value)} /></div>
          </div>
        </section>

        {/* Documents */}
        <section className="si-card">
          <h2>Documents Requested</h2>
          <div className="si-check-grid">
            {DOC_OPTIONS.map((d) => (
              <label key={d} className="si-check-row">
                <input type="checkbox" checked={form.documents_requested.includes(d)} onChange={() => toggleArr("documents_requested", d)} />
                {d}
              </label>
            ))}
          </div>
          <div className="si-field" style={{ marginTop: 12 }}>
            <label>Other</label>
            <input value={form.documents_other} onChange={(e) => patch("documents_other", e.target.value)} placeholder="Specify other documents" />
          </div>
        </section>

        {/* Telex */}
        <section className="si-card">
          <h2>Telex Release for B/L <span className="req">*</span></h2>
          <div className="si-radio-stack">
            {[
              { v: "yes", l: "Yes, Telex Release" },
              { v: "no", l: "No, Original B/L required" },
              { v: "upon_request", l: "Upon Request" },
            ].map((o) => (
              <label key={o.v} className="si-check-row">
                <input type="radio" name="telex" value={o.v} checked={form.telex_release === o.v}
                  onChange={() => patch("telex_release", o.v as FormState["telex_release"])} required />
                {o.l}
              </label>
            ))}
          </div>
        </section>

        {/* Shipping lines */}
        <section className="si-card">
          <h2>Approved Shipping Lines</h2>
          <label className="si-check-row" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={form.any_shipping_line} onChange={(e) => patch("any_shipping_line", e.target.checked)} />
            Any shipping line accepted
          </label>
          {!form.any_shipping_line && (
            <div className="si-check-grid">
              {SHIPPING_LINES.map((s) => (
                <label key={s} className="si-check-row">
                  <input type="checkbox" checked={form.approved_shipping_lines.includes(s)} onChange={() => toggleArr("approved_shipping_lines", s)} />
                  {s}
                </label>
              ))}
            </div>
          )}
        </section>

        {/* Observations */}
        <section className="si-card">
          <h2>Observations / Special Instructions</h2>
          <textarea rows={4} value={form.observations} onChange={(e) => patch("observations", e.target.value)} placeholder="Any special instructions for this shipment…" />
        </section>

        <div className="si-submit-row">
          <button type="submit" className="si-submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Shipping Instructions"}
          </button>
        </div>
      </form>

      <footer className="si-footer">© {new Date().getFullYear()} Mundus Trade · Connecting global meat trade</footer>
    </div>
  );
}

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div className="si-field">
      <label>{label}</label>
      <input value={value} readOnly={readOnly} disabled={readOnly} />
    </div>
  );
}