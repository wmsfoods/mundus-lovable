import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { lookupContact, captureLead } from "@/lib/publicLeadFlow";
import { repsFor, type LeadType } from "@/lib/mundusReps";

type Step =
  | "greet" | "email" | "lookup"
  | "existingAccount" | "existingContact"
  | "name" | "company" | "phone" | "country" | "protein" | "leadType" | "rep"
  | "submitting" | "done" | "error";

const PROTEINS = ["beef", "pork", "poultry", "lamb", "fish"];
const COUNTRIES = ["United States","China","Brazil","United Arab Emirates","Saudi Arabia","Hong Kong","Egypt","Chile","South Korea","Japan","Mexico","Other"];

export default function MaxChatWidget({
  open, onClose, initialLeadType = "buyer",
}: { open: boolean; onClose: () => void; initialLeadType?: LeadType }) {
  const { t, i18n } = useTranslation();
  const tk = (k: string, fb: string) => t(`public.chat.${k}`, fb) as string;
  const [step, setStep] = useState<Step>("greet");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [protein, setProtein] = useState("");
  const [leadType, setLeadType] = useState<LeadType>(initialLeadType);
  const [rep, setRep] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [step]);
  useEffect(() => { if (open) setStep("greet"); }, [open]);

  if (!open) return null;

  const goEmail = () => setStep("email");

  const submitEmail = async () => {
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
      setErrorMsg(tk("invalidEmail", "Please enter a valid email."));
      return;
    }
    setErrorMsg("");
    setStep("lookup");
    try {
      const res = await lookupContact(v);
      if (res.has_mundus_account) setStep("existingAccount");
      else if (res.found) setStep("existingContact");
      else setStep("name");
    } catch {
      setStep("name");
    }
  };

  const finalize = async () => {
    setStep("submitting");
    try {
      await captureLead({
        email, name, company, phone, country, protein,
        lead_type: leadType, mundus_rep: rep, lang: i18n.language,
      });
      setStep("done");
    } catch (e: any) {
      setErrorMsg(e?.message || "error");
      setStep("error");
    }
  };

  const eligibleReps = repsFor(leadType);

  const Bubble = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-[#1A1A2E]">{children}</div>
  );
  const UserEcho = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-2 ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#B64769] px-3 py-2 text-sm text-white">{children}</div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-2 sm:items-end sm:p-6">
      <div className="flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[600px]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-[#8B2252]">{tk("title", "Max — Mundus Assistant")}</div>
            <div className="text-[11px] text-gray-500">{tk("subtitle", "I'll connect you with a Mundus rep")}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <Bubble>{tk("greet", "Hi! I'm Max. I'll help you connect with a Mundus rep in under a minute.")}</Bubble>
          <Bubble>{tk("nextEmail", "Next step: share your work email so I can check if we already know you.")}</Bubble>

          {step !== "greet" && email && <UserEcho>{email}</UserEcho>}

          {step === "existingAccount" && (
            <>
              <Bubble>{tk("welcomeBack", "Welcome back! You already have a Mundus account.")}</Bubble>
              <Bubble>{tk("nextLogin", "Next step: log in to see the supplier behind this offer.")}</Bubble>
              <Link to={`/login?email=${encodeURIComponent(email)}`} className="mt-2 inline-block rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">{tk("loginNow", "Log in")}</Link>
            </>
          )}

          {step === "existingContact" && (
            <>
              <Bubble>{tk("knownContact", "We already know you. A Mundus rep is in touch — they'll reach out within 1 business day.")}</Bubble>
              <button onClick={onClose} className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">{tk("close", "Close")}</button>
            </>
          )}

          {step === "name" && <><Bubble>{tk("askName", "Great — what's your full name?")}</Bubble><Bubble>{tk("nextCompany", "Next: your company name.")}</Bubble></>}
          {name && ["company","phone","country","protein","leadType","rep","submitting","done"].includes(step) && <UserEcho>{name}</UserEcho>}
          {step === "company" && <Bubble>{tk("askCompany", "What's your company name?")}</Bubble>}
          {company && ["phone","country","protein","leadType","rep","submitting","done"].includes(step) && <UserEcho>{company}</UserEcho>}
          {step === "phone" && <Bubble>{tk("askPhone", "Best phone number? (optional but helps us reach you faster)")}</Bubble>}
          {phone && ["country","protein","leadType","rep","submitting","done"].includes(step) && <UserEcho>{phone}</UserEcho>}
          {step === "country" && <Bubble>{tk("askCountry", "Which country are you in?")}</Bubble>}
          {country && ["protein","leadType","rep","submitting","done"].includes(step) && <UserEcho>{country}</UserEcho>}
          {step === "protein" && <Bubble>{tk("askProtein", "Which protein are you most interested in?")}</Bubble>}
          {protein && ["leadType","rep","submitting","done"].includes(step) && <UserEcho>{protein}</UserEcho>}
          {step === "leadType" && <Bubble>{tk("askLeadType", "Are you buying, selling, or both?")}</Bubble>}
          {leadType && ["rep","submitting","done"].includes(step) && <UserEcho>{leadType}</UserEcho>}
          {step === "rep" && <Bubble>{tk("askRep", "Pick the Mundus rep you'd like to connect with.")}</Bubble>}
          {rep && ["submitting","done"].includes(step) && <UserEcho>{rep}</UserEcho>}

          {step === "submitting" && <Bubble>{tk("submitting", "Saving your details…")}</Bubble>}
          {step === "done" && (
            <>
              <Bubble>{tk("doneTitle", "All set! 🎉")}</Bubble>
              <Bubble>
                {leadType === "buyer"
                  ? t("public.chat.doneBuyer", "Thanks for registering! We'll review your information and move your approval forward shortly — so you can access the full offers here on Mundus. A rep ({{rep}}) will look after you.", { rep })
                  : t("public.chat.doneSupplier", "Perfect! The showcase offers are exclusive to approved buyers. As a supplier, we'll review your registration and a Mundus rep ({{rep}}) will reach out soon.", { rep })}
              </Bubble>
              <button onClick={onClose} className="mt-2 rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">{tk("close", "Close")}</button>
            </>
          )}
          {step === "error" && (
            <>
              <Bubble>{tk("errorBody", "Something went wrong. Please try again in a moment.")} ({errorMsg})</Bubble>
              <button onClick={finalize} className="mt-2 rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">{tk("retry", "Retry")}</button>
            </>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t bg-white p-3">
          {step === "greet" && (
            <button onClick={goEmail} className="w-full rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">{tk("start", "Start")}</button>
          )}
          {step === "email" && (
            <div className="flex gap-2">
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={submitEmail} className="rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">→</button>
            </div>
          )}
          {step === "lookup" && <div className="text-xs text-gray-500">{tk("checking", "Checking…")}</div>}
          {step === "name" && (
            <div className="flex gap-2">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={() => name.trim() && setStep("company")} className="rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">→</button>
            </div>
          )}
          {step === "company" && (
            <div className="flex gap-2">
              <input autoFocus value={company} onChange={(e) => setCompany(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={() => company.trim() && setStep("phone")} className="rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">→</button>
            </div>
          )}
          {step === "phone" && (
            <div className="flex gap-2">
              <input autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <button onClick={() => setStep("country")} className="rounded-md bg-[#B64769] px-3 py-2 text-sm font-semibold text-white">→</button>
            </div>
          )}
          {step === "country" && (
            <select autoFocus value={country} onChange={(e) => { setCountry(e.target.value); if (e.target.value) setStep("protein"); }}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">{tk("selectCountry", "Select country…")}</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {step === "protein" && (
            <div className="flex flex-wrap gap-2">
              {PROTEINS.map((p) => (
                <button key={p} onClick={() => { setProtein(p); setStep("leadType"); }}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs capitalize hover:bg-gray-100">{p}</button>
              ))}
            </div>
          )}
          {step === "leadType" && (
            <div className="flex flex-wrap gap-2">
              {(["buyer","supplier","buyer_supplier"] as LeadType[]).map((l) => (
                <button key={l} onClick={() => { setLeadType(l); setStep("rep"); }}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100">
                  {tk(`leadType_${l}`, l === "buyer" ? "Buying" : l === "supplier" ? "Selling" : "Both")}
                </button>
              ))}
            </div>
          )}
          {step === "rep" && (
            <div className="flex flex-wrap gap-2">
              {eligibleReps.map((r) => (
                <button key={r.name} onClick={() => { setRep(r.name); setTimeout(finalize, 50); }}
                  className="rounded-md border border-gray-300 px-3 py-2 text-xs hover:bg-gray-100">{r.name}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}