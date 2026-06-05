import { supabase } from "@/integrations/supabase/client";
import type { CutRow } from "@/lib/cutRowTypes";
import { compressImage } from "@/lib/imageOptimization";

type PortFreightShape =
  | { mode: "same"; same: string }
  | { mode: "perPort"; perPort: Record<string, string> };

export type SubmitLogistics = {
  originCountryId: string | null;
  originPortIds: string[];
  destinations: {
    countryId: string;
    selectedPortIds: string[];
    freight: PortFreightShape;
    insurance: PortFreightShape;
  }[];
  containerSize: string;
  fclCount: number;
  temperature: "Frozen" | "Chilled";
  incoterms: string[];
  certifications: string[];
  shipmentReady: string; // YYYY-MM (may be empty)
  sameFreightGlobal: boolean;
  globalFreight: string;
  globalInsurance: string;
  exwPickupLocation: string;
};

export type SubmitDistribution = {
  marketplace: boolean;
  allCustomers: boolean;
  specificCustomerIds: string[];
};

export type SubmitContext = {
  supplierId: string;
  supplierName: string;
  officeId: string | null;
  status: "draft" | "active";
};

export type SubmitInput = {
  logistics: SubmitLogistics;
  cuts: CutRow[];
  paymentTerms: string;
  distribution: SubmitDistribution;
  negotiationMode: string;
  negotiationDial: string;
  cutRegion?: "global" | "us";
  requestId?: string | null;
};

export type SubmitResult = { offerId: string; offerNumber: number };

const VALID_INCO = ["CIF", "CFR", "FOB", "EXW", "DDP", "DAP", "FAS", "DPU"];
const BUCKET = "offer-item-media";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

async function uploadOne(path: string, file: File): Promise<string> {
  const toUpload = file.type.startsWith("image/") ? await compressImage(file).catch(() => file) : file;
  const { error } = await supabase.storage.from(BUCKET).upload(path, toUpload, {
    contentType: toUpload.type || file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed (${path}): ${error.message}`);
  return path;
}

/**
 * Uploads photos + files for each cut to `offer-item-media`.
 * Path: {supplierId}/{offerId}/{cutTempId}/{kind}-{idx}-{filename}
 * Returns a parallel array of { photoUrl, filesUrls } keyed by cut index.
 */
export async function uploadCutMedia(
  cuts: CutRow[],
  supplierId: string,
  offerId: string,
): Promise<Array<{ photoUrl: string | null; filesUrls: string[] }>> {
  const out: Array<{ photoUrl: string | null; filesUrls: string[] }> = [];
  for (const c of cuts) {
    let photoUrl: string | null = null;
    const filesUrls: string[] = [];
    if (c.photoFile) {
      const p = `${supplierId}/${offerId}/${c.tempId}/photo-${safeName(c.photoFile.name)}`;
      photoUrl = await uploadOne(p, c.photoFile);
    }
    for (let i = 0; i < c.files.length; i++) {
      const f = c.files[i].file;
      const p = `${supplierId}/${offerId}/${c.tempId}/file-${i}-${safeName(f.name)}`;
      filesUrls.push(await uploadOne(p, f));
    }
    out.push({ photoUrl, filesUrls });
  }
  return out;
}

function deriveShipment(yyyymm: string): { shipment_month: number; shipment_year: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyymm || "");
  if (m) return { shipment_year: Number(m[1]), shipment_month: Number(m[2]) };
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { shipment_month: d.getMonth() + 1, shipment_year: d.getFullYear() };
}

export function validateForPublish(input: SubmitInput): string | null {
  const { logistics: l, cuts, paymentTerms, distribution: d } = input;
  if (!l.originPortIds || l.originPortIds.length === 0) return "missingOrigin";
  if ((l.incoterms.includes("FOB") || l.incoterms.includes("EXW")) && l.originPortIds.length > 1) {
    return "singleOriginPortRequired";
  }
  if (l.destinations.length === 0) return "missingDestinations";
  if (l.incoterms.length === 0) return "missingIncoterm";
  if (cuts.length === 0) return "missingCuts";
  for (const c of cuts) {
    if (!c.cutId) return "missingCutResolution";
    if (!(c.qty > 0) || !(c.askPrice > 0)) return "invalidCutNumbers";
    if (c.floorPrice > 0 && c.floorPrice > c.askPrice) return "floorGtAsk";
  }
  if (!paymentTerms) return "missingPayment";
  if (!d.marketplace && !d.allCustomers && d.specificCustomerIds.length === 0) return "missingDistribution";
  return null;
}

/**
 * Inserts offers + offer_items (+ allowed incoterms, markets, freight_options).
 * Uploads media after the offer row exists (needs offerId in path).
 * On any failure after offers insert, rolls back child rows + the offer itself.
 */
export async function submitOfferV2(
  input: SubmitInput,
  ctx: SubmitContext,
): Promise<SubmitResult> {
  if (ctx.status === "active") {
    const reason = validateForPublish(input);
    if (reason) throw new Error(reason);
  }

  const { logistics: l, cuts, paymentTerms, distribution, negotiationMode, negotiationDial } = input;
  const { shipment_month, shipment_year } = deriveShipment(l.shipmentReady);

  // Resolve origin port label + country name for snapshot columns.
  let originPortLabel: string | null = null;
  let originCountryName: string | null = null;
  if (l.originPortId) {
    const { data: port } = await supabase
      .from("ports")
      .select("name, code, country_id")
      .eq("id", l.originPortId)
      .maybeSingle();
    if (port) {
      originPortLabel = port.code ? `${port.name} (${port.code})` : port.name;
      if (port.country_id) {
        const { data: country } = await supabase
          .from("countries")
          .select("english_name")
          .eq("id", port.country_id)
          .maybeSingle();
        originCountryName = country?.english_name ?? null;
      }
    }
  }

  // 1. Insert offer
  const certifications = l.certifications;
  const offerInsert = {
    supplier_id: ctx.supplierId,
    supplier_name: ctx.supplierName,
    status: ctx.status,
    origin_country: originCountryName,
    origin_port: originPortLabel,
    origin_port_id: l.originPortId,
    shipment_month,
    shipment_year,
    payment_terms: paymentTerms || null,
    container_size: l.containerSize,
    total_fcl: Math.max(1, l.fclCount),
    is_halal: certifications.includes("Halal"),
    is_kosher: certifications.includes("Kosher"),
    office_id: ctx.officeId ?? ctx.supplierId,
    plant_id: cuts.find((c) => c.plantId)?.plantId ?? null,
    negotiation_mode: negotiationMode,
    negotiation_dial: negotiationDial,
    specific_buyer_company_ids:
      distribution.specificCustomerIds.length > 0 ? distribution.specificCustomerIds : null,
    all_customers: !!distribution.allCustomers,
    exw_pickup_location:
      l.incoterms.includes("EXW") && l.exwPickupLocation.trim()
        ? l.exwPickupLocation.trim()
        : null,
    cut_region: input.cutRegion ?? "global",
    request_id: input.requestId ?? null,
  };
  // remove undefined keys
  Object.keys(offerInsert).forEach((k) => {
    if ((offerInsert as Record<string, unknown>)[k] === undefined) delete (offerInsert as Record<string, unknown>)[k];
  });

  const { data: offer, error: offerErr } = await supabase
    .from("offers")
    .insert(offerInsert)
    .select("id, offer_number")
    .single();
  if (offerErr || !offer) throw new Error(`Failed to create offer: ${offerErr?.message ?? "no data"}`);

  const offerId = offer.id as string;
  const cleanup = async () => {
    await supabase.from("offer_items").delete().eq("offer_id", offerId);
    await supabase.from("offer_allowed_incoterms").delete().eq("offer_id", offerId);
    await supabase.from("offer_markets").delete().eq("offer_id", offerId);
    await supabase.from("freight_options").delete().eq("offer_id", offerId);
    await supabase.from("offers").delete().eq("id", offerId);
  };

  try {
    // 2. Upload media → get URLs
    const media = await uploadCutMedia(cuts, ctx.supplierId, offerId);

    // 3. Resolve customer_products + insert offer_items
    type OfferItemInsert = {
      offer_id: string;
      customer_product_id: string;
      amount: number;
      price: number;
      minimum_price: number;
      minimum_amount: number;
      maximum_amount: number;
      condition: string;
      aging_method: string | null;
      packaging: string | null;
      plant_id: string | null;
      brand_id: string | null;
      notes: string | null;
      photo_url: string | null;
      files_urls: string[] | null;
    };
    const itemsRows: OfferItemInsert[] = [];
    for (let i = 0; i < cuts.length; i++) {
      const c = cuts[i];
      if (!c.cutId) continue;
      if (!(c.qty > 0) || !(c.askPrice > 0)) continue;
      const floor =
        c.floorPrice > 0 && c.floorPrice <= c.askPrice ? c.floorPrice : c.askPrice;

      const { data: cpId, error: rpcErr } = await supabase.rpc("resolve_customer_product", {
        p_company_id: ctx.supplierId,
        p_cut_id: c.cutId,
      });
      if (rpcErr || !cpId) {
        throw new Error(`resolve_customer_product failed: ${rpcErr?.message ?? "no id"}`);
      }
      itemsRows.push({
        offer_id: offerId,
        customer_product_id: cpId as string,
        amount: c.qty,
        price: c.askPrice,
        minimum_price: floor,
        minimum_amount: c.qty,
        maximum_amount: c.qty,
        condition: l.temperature,
        aging_method: null,
        packaging: c.packing || null,
        plant_id: c.plantId,
        brand_id: c.brandId,
        notes: c.notes || null,
        photo_url: media[i]?.photoUrl ?? c.existingPhotoPath ?? null,
        files_urls:
          media[i]?.filesUrls?.length
            ? media[i].filesUrls
            : c.existingFilesPaths && c.existingFilesPaths.length > 0
              ? c.existingFilesPaths
              : null,
      });
    }
    if (itemsRows.length === 0 && ctx.status === "active") {
      throw new Error("No resolvable cuts");
    }
    if (itemsRows.length > 0) {
      const { error } = await supabase.from("offer_items").insert(itemsRows);
      if (error) throw new Error(`offer_items insert failed: ${error.message}`);
    }

    // 4. Allowed incoterms
    const allowed = l.incoterms.filter((x) => VALID_INCO.includes(x));
    if (allowed.length > 0) {
      const { error } = await supabase
        .from("offer_allowed_incoterms")
        .insert(allowed.map((it) => ({ offer_id: offerId, incoterm_type: it })));
      if (error) throw new Error(`offer_allowed_incoterms failed: ${error.message}`);
    }

    // 5. Markets (country → market_id)
    const countryIds = l.destinations.map((d) => d.countryId).filter(Boolean);
    if (countryIds.length > 0) {
      const { data: mktRows, error: mktErr } = await supabase
        .from("markets")
        .select("id, country_id")
        .in("country_id", countryIds);
      if (mktErr) throw new Error(`markets lookup failed: ${mktErr.message}`);
      const byCountry = new Map((mktRows ?? []).map((r) => [r.country_id as string, r.id as string]));
      const mktInserts = countryIds
        .map((cid) => byCountry.get(cid))
        .filter((v): v is string => !!v)
        .map((market_id) => ({ offer_id: offerId, market_id }));
      if (mktInserts.length > 0) {
        const { error: omErr } = await supabase.from("offer_markets").insert(mktInserts);
        if (omErr) throw new Error(`offer_markets failed: ${omErr.message}`);
      }
    }

    // 6. Freight options (one row per unique port)
    const freightInserts: Array<{ offer_id: string; port_id: string; cost: number; insurance: number }> = [];
    const seen = new Set<string>();
    const cifEnabled = l.incoterms.includes("CIF");
    for (const d of l.destinations) {
      for (const pid of d.selectedPortIds) {
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);
        let raw: string;
        if (l.sameFreightGlobal) {
          raw = l.globalFreight;
        } else if (d.freight.mode === "same") {
          raw = d.freight.same;
        } else {
          raw = d.freight.perPort[pid] ?? "";
        }
        const cost = parseFloat(String(raw ?? "").replace(/,/g, "")) || 0;
        let insRaw = "";
        if (cifEnabled) {
          if (l.sameFreightGlobal) {
            insRaw = l.globalInsurance;
          } else if (d.insurance?.mode === "same") {
            insRaw = d.insurance.same;
          } else if (d.insurance?.mode === "perPort") {
            insRaw = d.insurance.perPort[pid] ?? "";
          }
        }
        const insurance = parseFloat(String(insRaw ?? "").replace(/,/g, "")) || 0;
        freightInserts.push({ offer_id: offerId, port_id: pid, cost, insurance });
      }
    }
    if (freightInserts.length > 0) {
      const { error } = await supabase.from("freight_options").insert(freightInserts);
      if (error) throw new Error(`freight_options failed: ${error.message}`);
    }

    return { offerId, offerNumber: offer.offer_number as number };
  } catch (e) {
    console.error("[submitOfferV2] rollback after error:", e);
    await cleanup().catch(() => {});
    throw e;
  }
}

/**
 * Updates an existing offer in place — same offer_id, same offer_number.
 * Replace strategy for child rows: DELETE + INSERT (offer_items,
 * offer_allowed_incoterms, offer_markets, freight_options).
 * Uploads only newly-picked photo/files; existing storage paths are
 * preserved through `c.existingPhotoPath` / `c.existingFilesPaths`.
 */
export async function updateOfferV2(
  offerId: string,
  input: SubmitInput,
  ctx: SubmitContext,
): Promise<SubmitResult> {
  if (ctx.status === "active") {
    const reason = validateForPublish(input);
    if (reason) throw new Error(reason);
  }

  const { logistics: l, cuts, paymentTerms, distribution, negotiationMode, negotiationDial } = input;
  const { shipment_month, shipment_year } = deriveShipment(l.shipmentReady);

  // Resolve origin port label for snapshot columns (same as create).
  let originPortLabel: string | null = null;
  let originCountryName: string | null = null;
  if (l.originPortId) {
    const { data: port } = await supabase
      .from("ports")
      .select("name, code, country_id")
      .eq("id", l.originPortId)
      .maybeSingle();
    if (port) {
      originPortLabel = port.code ? `${port.name} (${port.code})` : port.name;
      if (port.country_id) {
        const { data: country } = await supabase
          .from("countries")
          .select("english_name")
          .eq("id", port.country_id)
          .maybeSingle();
        originCountryName = country?.english_name ?? null;
      }
    }
  }

  const certifications = l.certifications;
  const offerUpdate: Record<string, unknown> = {
    status: ctx.status,
    origin_country: originCountryName,
    origin_port: originPortLabel,
    origin_port_id: l.originPortId,
    shipment_month,
    shipment_year,
    payment_terms: paymentTerms || null,
    container_size: l.containerSize,
    total_fcl: Math.max(1, l.fclCount),
    is_halal: certifications.includes("Halal"),
    is_kosher: certifications.includes("Kosher"),
    plant_id: cuts.find((c) => c.plantId)?.plantId ?? null,
    negotiation_mode: negotiationMode,
    negotiation_dial: negotiationDial,
    specific_buyer_company_ids:
      distribution.specificCustomerIds.length > 0 ? distribution.specificCustomerIds : null,
    all_customers: !!distribution.allCustomers,
    exw_pickup_location:
      l.incoterms.includes("EXW") && l.exwPickupLocation.trim()
        ? l.exwPickupLocation.trim()
        : null,
    cut_region: input.cutRegion ?? "global",
    request_id: input.requestId ?? null,
  };

  const { error: updErr } = await supabase
    .from("offers")
    .update(offerUpdate as never)
    .eq("id", offerId);
  if (updErr) throw new Error(`Failed to update offer: ${updErr.message}`);

  // Replace strategy: drop children, re-insert.
  await supabase.from("offer_items").delete().eq("offer_id", offerId);
  await supabase.from("offer_allowed_incoterms").delete().eq("offer_id", offerId);
  await supabase.from("offer_markets").delete().eq("offer_id", offerId);
  await supabase.from("freight_options").delete().eq("offer_id", offerId);

  // Upload only newly-picked media (existing paths flow through).
  const media = await uploadCutMedia(cuts, ctx.supplierId, offerId);

  // offer_items
  type OfferItemInsert = {
    offer_id: string;
    customer_product_id: string;
    amount: number;
    price: number;
    minimum_price: number;
    minimum_amount: number;
    maximum_amount: number;
    condition: string;
    aging_method: string | null;
    packaging: string | null;
    plant_id: string | null;
    brand_id: string | null;
    notes: string | null;
    photo_url: string | null;
    files_urls: string[] | null;
  };
  const itemsRows: OfferItemInsert[] = [];
  for (let i = 0; i < cuts.length; i++) {
    const c = cuts[i];
    if (!c.cutId) continue;
    if (!(c.qty > 0) || !(c.askPrice > 0)) continue;
    const floor = c.floorPrice > 0 && c.floorPrice <= c.askPrice ? c.floorPrice : c.askPrice;
    const { data: cpId, error: rpcErr } = await supabase.rpc("resolve_customer_product", {
      p_company_id: ctx.supplierId,
      p_cut_id: c.cutId,
    });
    if (rpcErr || !cpId) throw new Error(`resolve_customer_product failed: ${rpcErr?.message ?? "no id"}`);
    itemsRows.push({
      offer_id: offerId,
      customer_product_id: cpId as string,
      amount: c.qty,
      price: c.askPrice,
      minimum_price: floor,
      minimum_amount: c.qty,
      maximum_amount: c.qty,
      condition: l.temperature,
      aging_method: null,
      packaging: c.packing || null,
      plant_id: c.plantId,
      brand_id: c.brandId,
      notes: c.notes || null,
      photo_url: media[i]?.photoUrl ?? c.existingPhotoPath ?? null,
      files_urls:
        media[i]?.filesUrls?.length
          ? media[i].filesUrls
          : c.existingFilesPaths && c.existingFilesPaths.length > 0
            ? c.existingFilesPaths
            : null,
    });
  }
  if (itemsRows.length > 0) {
    const { error } = await supabase.from("offer_items").insert(itemsRows);
    if (error) throw new Error(`offer_items insert failed: ${error.message}`);
  }

  // allowed incoterms
  const allowed = l.incoterms.filter((x) => VALID_INCO.includes(x));
  if (allowed.length > 0) {
    const { error } = await supabase
      .from("offer_allowed_incoterms")
      .insert(allowed.map((it) => ({ offer_id: offerId, incoterm_type: it })));
    if (error) throw new Error(`offer_allowed_incoterms failed: ${error.message}`);
  }

  // markets
  const countryIds = l.destinations.map((d) => d.countryId).filter(Boolean);
  if (countryIds.length > 0) {
    const { data: mktRows, error: mktErr } = await supabase
      .from("markets")
      .select("id, country_id")
      .in("country_id", countryIds);
    if (mktErr) throw new Error(`markets lookup failed: ${mktErr.message}`);
    const byCountry = new Map((mktRows ?? []).map((r) => [r.country_id as string, r.id as string]));
    const mktInserts = countryIds
      .map((cid) => byCountry.get(cid))
      .filter((v): v is string => !!v)
      .map((market_id) => ({ offer_id: offerId, market_id }));
    if (mktInserts.length > 0) {
      const { error: omErr } = await supabase.from("offer_markets").insert(mktInserts);
      if (omErr) throw new Error(`offer_markets failed: ${omErr.message}`);
    }
  }

  // freight
  const freightInserts: Array<{ offer_id: string; port_id: string; cost: number; insurance: number }> = [];
  const seen = new Set<string>();
  const cifEnabled = l.incoterms.includes("CIF");
  for (const d of l.destinations) {
    for (const pid of d.selectedPortIds) {
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      let raw: string;
      if (l.sameFreightGlobal) raw = l.globalFreight;
      else if (d.freight.mode === "same") raw = d.freight.same;
      else raw = d.freight.perPort[pid] ?? "";
      const cost = parseFloat(String(raw ?? "").replace(/,/g, "")) || 0;
      let insRaw = "";
      if (cifEnabled) {
        if (l.sameFreightGlobal) insRaw = l.globalInsurance;
        else if (d.insurance?.mode === "same") insRaw = d.insurance.same;
        else if (d.insurance?.mode === "perPort") insRaw = d.insurance.perPort[pid] ?? "";
      }
      const insurance = parseFloat(String(insRaw ?? "").replace(/,/g, "")) || 0;
      freightInserts.push({ offer_id: offerId, port_id: pid, cost, insurance });
    }
  }
  if (freightInserts.length > 0) {
    const { error } = await supabase.from("freight_options").insert(freightInserts);
    if (error) throw new Error(`freight_options failed: ${error.message}`);
  }

  // Re-read offer_number (immutable but we return for the toast).
  const { data: row } = await supabase
    .from("offers")
    .select("offer_number")
    .eq("id", offerId)
    .maybeSingle();
  return { offerId, offerNumber: (row?.offer_number as number) ?? 0 };
}