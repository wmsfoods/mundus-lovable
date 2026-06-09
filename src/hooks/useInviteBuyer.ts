import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOffice } from "./useActiveOffice";
import { useCurrentCompany } from "./useCurrentCompany";
import { sendEmailNotification } from "@/lib/emailSender";
import { supabase as supa } from "@/integrations/supabase/client";
import { createNotification } from "@/lib/notifications";
import { sendPushToUser } from "@/lib/push";

export type InviteBuyerFlow =
  | "invited_existing_buyer"
  | "reinvited_existing_buyer"
  | "invited_new_buyer"
  | "invited_new_contact_existing_company"
  | "new_contact_existing_link";

export type InviteBuyerInput = {
  email: string;
  companyName?: string;
  contactName?: string;
  taxId?: string;
  phone?: string;
  country?: string;
  privateLabel?: string;
  notes?: string;
  /** Override the supplier office (defaults to active office / company). */
  supplierOfficeId?: string;
};

export type InviteBuyerResult = {
  ok: boolean;
  flow?: InviteBuyerFlow;
  link_id?: string;
  user_request_id?: string;
  reason?: string;
};

export function useInviteBuyer() {
  const qc = useQueryClient();
  const { activeOfficeId } = useActiveOffice();
  const { company } = useCurrentCompany();
  const fallbackOfficeId = activeOfficeId ?? company?.id ?? null;

  const mutation = useMutation({
    mutationFn: async (input: InviteBuyerInput): Promise<InviteBuyerResult> => {
      const officeId = input.supplierOfficeId ?? fallbackOfficeId;
      if (!officeId) throw new Error("no_active_office");
      const args: Record<string, unknown> = {
        p_supplier_office_id: officeId,
        p_email: input.email,
      };
      if (input.companyName) args.p_company_name = input.companyName;
      if (input.contactName) args.p_contact_name = input.contactName;
      if (input.taxId) args.p_tax_id = input.taxId;
      if (input.phone) args.p_phone = input.phone;
      if (input.country) args.p_country = input.country;
      if (input.privateLabel) args.p_private_label = input.privateLabel;
      if (input.notes) args.p_notes = input.notes;
      const { data, error } = await (supabase as any).rpc("create_supplier_invite", args);
      if (error) throw error;
      const result = (data ?? { ok: false, reason: "no_response" }) as InviteBuyerResult;

      // Fire SCL invite email (non-blocking). Pick template based on flow.
      if (result.ok && input.email) {
        try {
          const supplierName = company?.name ?? "A supplier";
          const isSignup =
            result.flow === "invited_new_buyer" ||
            result.flow === "invited_new_contact_existing_company";
          if (isSignup) {
            await sendEmailNotification(
              "scl_invite_signup" as any,
              input.email,
              { supplier: supplierName, linkId: result.link_id } as any,
            );
          } else {
            await sendEmailNotification(
              "scl_invite_existing" as any,
              input.email,
              { supplier: supplierName, recipientName: input.contactName } as any,
            );
            // Bell + Push for already-registered buyers (#9)
            try {
              const { data: u } = await supa
                .from("users")
                .select("id")
                .ilike("email", input.email)
                .maybeSingle();
              const userId = (u as any)?.id as string | undefined;
              if (userId) {
                createNotification({
                  userId,
                  title: `${supplierName} invited you`,
                  body: "You have been added as a customer on Mundus Trade.",
                  icon: "bell",
                  category: "system",
                  linkUrl: "/buyer/suppliers",
                  linkLabel: "View supplier",
                }).catch(() => {});
                sendPushToUser(userId, {
                  title: `${supplierName} invited you`,
                  body: "You have been added as a customer.",
                  url: "/buyer/suppliers",
                  category: "system",
                }).catch(() => {});
              }
            } catch (e) {
              console.warn("[useInviteBuyer] bell/push lookup failed", e);
            }
          }
        } catch (e) {
          console.warn("[useInviteBuyer] SCL invite email failed (non-blocking)", e);
        }
      }
      return result;
    },
    onSuccess: (_, vars) => {
      const officeId = vars.supplierOfficeId ?? fallbackOfficeId;
      qc.invalidateQueries({
        queryKey: ["supplier-customer-links", "my-customers", officeId],
      });
    },
  });

  return {
    inviteBuyer: mutation.mutateAsync,
    isInviting: mutation.isPending,
    error: mutation.error ? (mutation.error as Error).message : null,
  };
}