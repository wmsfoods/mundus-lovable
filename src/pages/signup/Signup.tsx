import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Upload, X, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SignupShell } from "./SignupShell";
import { PasswordRequirements } from "./PasswordRequirements";
import { allRulesMet, checkPassword } from "./passwordRules";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";

const MUNDUS_TRADE_COMPANY_ID = "00000000-0000-beef-0000-000000000001";
const WINE = "#B64769";

const inputCls =
  "h-12 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769] bg-white";

const countryCodes = [
  { code: "+1", flag: "🇺🇸" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+86", flag: "🇨🇳" },
  { code: "+52", flag: "🇲🇽" },
  { code: "+54", flag: "🇦🇷" },
];

const PROTEINS = ["Beef", "Pork", "Poultry", "Ovine", "Seafood"];

const TAX_ID_RULES: Record<string, { label: string; hint: string; pattern: RegExp }> = {
  "United States": { label: "EIN", hint: "Format: XX-XXXXXXX (9 digits)", pattern: /^\d{2}-?\d{7}$/ },
  "Brazil": { label: "CNPJ", hint: "Format: XX.XXX.XXX/XXXX-XX", pattern: /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/ },
  "United Kingdom": { label: "VAT Number", hint: "Format: GB + 9 digits", pattern: /^GB\d{9}(\d{3})?$/ },
  "Germany": { label: "USt-IdNr", hint: "Format: DE + 9 digits", pattern: /^DE\d{9}$/ },
  "France": { label: "N° TVA", hint: "Format: FR + 2 chars + 9 digits", pattern: /^FR[A-Z0-9]{2}\d{9}$/i },
  "Argentina": { label: "CUIT", hint: "Format: XX-XXXXXXXX-X (11 digits)", pattern: /^\d{2}-?\d{8}-?\d{1}$/ },
  "China": { label: "USCC", hint: "18 alphanumeric characters", pattern: /^[A-Z0-9]{18}$/i },
  "United Arab Emirates": { label: "TRN", hint: "15 digits", pattern: /^\d{15}$/ },
  "Saudi Arabia": { label: "VAT", hint: "15 digits starting with 3", pattern: /^3\d{14}$/ },
  "Australia": { label: "ABN", hint: "11 digits", pattern: /^\d{11}$/ },
  "Uruguay": { label: "RUT", hint: "12 digits", pattern: /^\d{12}$/ },
  "Paraguay": { label: "RUC", hint: "Format: XXXXXXXX-X", pattern: /^\d{1,8}-?\d{1}$/ },
  "Mexico": { label: "RFC", hint: "12-13 alphanumeric", pattern: /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i },
  "Chile": { label: "RUT", hint: "Format: XX.XXX.XXX-X", pattern: /^\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Kk]$/ },
  "Colombia": { label: "NIT", hint: "9-10 digits", pattern: /^\d{9,10}$/ },
};
const DEFAULT_TAX_RULE = { label: "Tax ID", hint: "5-25 alphanumeric characters", pattern: /^[A-Z0-9.\-\/]{5,25}$/i };

function getTaxRule(country?: string) {
  if (!country) return DEFAULT_TAX_RULE;
  return TAX_ID_RULES[country] || DEFAULT_TAX_RULE;
}

type Role = "buyer" | "supplier" | "";

type FormData = {
  // step 1
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
  agreeTerms: boolean;
  // step 2 (verification) — no fields, just verified flag
  emailVerified: boolean;
  // step 3 company
  companyName: string;
  taxId: string;
  role: Role;
  proteins: string[];
  registrationCountry: string;
  countriesOfOperation: { name: string; flag?: string }[];
  certificate: File | null;
  // step 4 contact
  state: string;
  city: string;
  address: string;
  addressLine2: string;
  zip: string;
  country: string;
  phoneCode: string;
  phoneFlag: string;
  phoneNumber: string;
  website: string;
};

const initial: FormData = {
  name: "",
  email: "",
  password: "",
  repeatPassword: "",
  agreeTerms: false,
  emailVerified: false,
  companyName: "",
  taxId: "",
  role: "",
  proteins: [],
  registrationCountry: "",
  countriesOfOperation: [],
  certificate: null,
  state: "",
  city: "",
  address: "",
  addressLine2: "",
  zip: "",
  country: "",
  phoneCode: "+1",
  phoneFlag: "🇺🇸",
  phoneNumber: "",
  website: "",
};

export default function Signup() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initial);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const stepNames = [
    t("signup.steps.basic"),
    t("signup.steps.verification"),
    t("signup.steps.company"),
    t("signup.steps.contact"),
  ];

  const handleFinish = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: data.name },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    const { error: reqErr } = await supabase.from("user_requests").insert({
      company_id: MUNDUS_TRADE_COMPANY_ID,
      name: data.name,
      email: data.email,
      status: "pending",
    });
    setSubmitting(false);
    if (reqErr) {
      toast.error(reqErr.message);
      return;
    }
    navigate(`/signup/success?email=${encodeURIComponent(data.email)}`);
  };

  const handleMobileBack = () => {
    if (step === 1) navigate("/login");
    else setStep((s) => s - 1);
  };

  // Step 1 → Step 2: check email + send code
  const goFromStep1 = async () => {
    setSubmitting(true);
    try {
      const { data: check, error: checkErr } = await supabase.functions.invoke(
        "verify-email",
        { body: { action: "check", email: data.email } },
      );
      if (checkErr) throw checkErr;
      if (check?.exists) {
        toast.error(t("signup.verification.alreadyRegistered"), {
          action: {
            label: t("signup.verification.goToLogin"),
            onClick: () => navigate("/login"),
          },
        });
        return;
      }
      const { data: send, error: sendErr } = await supabase.functions.invoke(
        "verify-email",
        { body: { action: "send", email: data.email } },
      );
      if (sendErr) throw sendErr;
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send verification code");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SignupShell onBack={handleMobileBack}>
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
        <h2 className="text-2xl font-bold text-center text-[#111]">{t("signup.title")}</h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          {t("signup.stepOf", { current: step, total: 4 })}
        </p>
        <p className="text-base font-bold text-center mt-1" style={{ color: WINE }}>
          {stepNames[step - 1]}
        </p>

        {/* Stepper */}
        <Stepper step={step} labels={stepNames} />

        <div className="mt-8">
          {step === 1 && (
            <Step1 data={data} set={set} submitting={submitting} onNext={goFromStep1} />
          )}
          {step === 2 && (
            <StepVerify
              email={data.email}
              onBack={() => setStep(1)}
              onVerified={() => {
                set("emailVerified", true);
                toast.success(t("signup.verification.success"));
                setStep(3);
              }}
              onResend={async () => {
                const { data: send } = await supabase.functions.invoke("verify-email", {
                  body: { action: "send", email: data.email },
                });
              }}
            />
          )}
          {step === 3 && (
            <Step3Company
              data={data}
              set={set}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4Contact
              data={data}
              set={set}
              onBack={() => setStep(3)}
              onFinish={handleFinish}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </SignupShell>
  );
}

/* ----------------- STEPPER ----------------- */
function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 md:gap-3">
        {labels.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={n} className="flex-1 flex items-center gap-2 md:gap-3 min-w-0">
              <div
                className={cn(
                  "h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                  done
                    ? "bg-[#B64769] text-white"
                    : active
                      ? "bg-[#B64769] text-white ring-4 ring-[#B64769]/15"
                      : "bg-gray-200 text-gray-500",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  "hidden md:inline text-xs font-medium truncate",
                  active ? "text-[#111]" : done ? "text-gray-600" : "text-gray-400",
                )}
              >
                {label}
              </span>
              {n < labels.length && (
                <div
                  className={cn(
                    "flex-1 h-0.5 rounded",
                    n < step ? "bg-[#B64769]" : "bg-gray-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------- STEP 1 ----------------- */
function Step1({
  data,
  set,
  onNext,
  submitting,
}: {
  data: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [showP, setShowP] = useState(false);
  const [showR, setShowR] = useState(false);
  const rules = useMemo(() => checkPassword(data.password), [data.password]);
  const passwordsMatch = data.password === data.repeatPassword && data.password.length > 0;
  const canProceed =
    !!data.name && !!data.email && passwordsMatch && allRulesMet(rules) && data.agreeTerms;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={t("signup.fields.fullName")}>
          <input
            className={inputCls}
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("signup.fields.fullNamePlaceholder")}
          />
        </Field>
        <Field label={t("signup.fields.email")}>
          <input
            type="email"
            className={inputCls}
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={t("signup.fields.emailPlaceholder")}
          />
        </Field>
        <Field label={t("signup.fields.password")}>
          <div className="relative">
            <input
              type={showP ? "text" : "password"}
              className={cn(inputCls, "pr-12")}
              value={data.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder={t("signup.fields.passwordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowP((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showP ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        <Field label={t("signup.fields.repeatPassword")}>
          <div className="relative">
            <input
              type={showR ? "text" : "password"}
              className={cn(inputCls, "pr-12")}
              value={data.repeatPassword}
              onChange={(e) => set("repeatPassword", e.target.value)}
              placeholder={t("signup.fields.repeatPasswordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowR((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showR ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {data.repeatPassword && !passwordsMatch && (
            <p className="text-red-500 text-sm mt-1">{t("signup.passwordsMismatch")}</p>
          )}
        </Field>
      </div>

      <PasswordRequirements rules={rules} />

      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={data.agreeTerms}
          onChange={(e) => set("agreeTerms", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#B64769]"
        />
        <span>
          {t("signup.agreeTerms")}{" "}
          <a href="#" className="underline" style={{ color: WINE }}>
            {t("signup.termsLink")}
          </a>
        </span>
      </label>

      <div className="flex gap-3">
        <Link
          to="/login"
          className="h-11 px-6 inline-flex items-center justify-center rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
        >
          {t("common.cancel")}
        </Link>
        <button
          disabled={!canProceed || submitting}
          onClick={onNext}
          className={cn(
            "h-11 px-6 rounded-full text-sm font-medium transition",
            canProceed && !submitting
              ? "bg-[#B64769] text-white hover:bg-[#8E3653]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed",
          )}
        >
          {submitting ? t("common.submitting") : t("common.proceed")}
        </button>
      </div>
    </div>
  );
}

/* ----------------- STEP 2: VERIFY EMAIL ----------------- */
function StepVerify({
  email,
  onBack,
  onVerified,
  onResend,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
  onResend: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const [resending, setResending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const submit = async (code: string) => {
    setVerifying(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("verify-email", {
        body: { action: "verify", email, code },
      });
      if (err) throw err;
      if (res?.verified) {
        onVerified();
        return;
      }
      if (typeof res?.attemptsRemaining === "number") {
        setError(t("signup.verification.invalid", { remaining: res.attemptsRemaining }));
      } else if (res?.error?.toLowerCase().includes("expired")) {
        setError(t("signup.verification.expired"));
      } else if (res?.error?.toLowerCase().includes("too many")) {
        setError(t("signup.verification.tooMany"));
      } else {
        setError(res?.error || t("signup.verification.invalid", { remaining: 0 }));
      }
      setDigits(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } catch (e: any) {
      setError(e?.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const onDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError(null);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d !== "")) submit(next.join(""));
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (txt.length === 0) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < txt.length; i++) next[i] = txt[i];
    setDigits(next);
    if (txt.length === 6) submit(txt);
    else refs.current[txt.length]?.focus();
  };

  const resend = async () => {
    if (resendIn > 0 || resending) return;
    setResending(true);
    try {
      await onResend();
      setDigits(["", "", "", "", "", ""]);
      setError(null);
      setResendIn(60);
      refs.current[0]?.focus();
      toast.success(t("signup.success.resent"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="text-4xl">📧</div>
      <h3 className="text-xl font-bold text-[#111]">{t("signup.verification.title")}</h3>
      <p className="text-sm text-gray-600">
        {t("signup.verification.subtitle")}{" "}
        <span className="font-semibold text-[#111]">{email}</span>
      </p>
      <p className="text-sm text-gray-500">{t("signup.verification.enterCode")}</p>

      <div className="flex justify-center gap-2 md:gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            disabled={verifying}
            onChange={(e) => onDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={onPaste}
            className="h-12 w-12 md:h-14 md:w-14 rounded-lg border border-gray-300 bg-white text-center text-2xl font-bold text-[#111] outline-none focus:border-[#B64769] focus:ring-2 focus:ring-[#B64769]/30"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {verifying && <p className="text-sm text-gray-500">…</p>}

      <div className="text-sm">
        <button
          type="button"
          onClick={resend}
          disabled={resendIn > 0 || resending}
          className={cn(
            "underline",
            resendIn > 0 || resending ? "text-gray-400 cursor-not-allowed" : "text-[#B64769]",
          )}
        >
          {resendIn > 0
            ? t("signup.verification.resendIn", { seconds: resendIn })
            : t("signup.verification.resend")}
        </button>
      </div>

      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="h-11 px-6 rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
        >
          {t("common.back")}
        </button>
      </div>
    </div>
  );
}

/* ----------------- STEP 3: COMPANY ----------------- */
function Step3Company({
  data,
  set,
  onBack,
  onNext,
}: {
  data: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const [taxIdTouched, setTaxIdTouched] = useState(false);
  const taxRule = getTaxRule(data.registrationCountry);
  const taxIdValid = taxRule.pattern.test(data.taxId.trim());
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const onFile = async (f: File | null) => {
    if (!f) {
      set("certificate", null);
      setScanResult(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error(t("signup.fileTooLarge"));
      return;
    }
    set("certificate", f);
    setScanning(true);
    setScanResult(null);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("Read failed"));
        reader.readAsDataURL(f);
      });
      const { data: scanData, error: scanError } = await supabase.functions.invoke("verify-document", {
        body: {
          fileBase64: base64,
          fileType: f.type,
          companyName: data.companyName,
          taxId: data.taxId,
          registrationCountry: data.registrationCountry,
        },
      });
      if (scanError) throw scanError;
      setScanResult(scanData);
    } catch (err) {
      console.warn("[DocScan] error:", err);
      setScanResult({ overallVerification: "error", notes: "Scan failed" });
    } finally {
      setScanning(false);
    }
  };

  const canProceed =
    !!data.companyName &&
    !!data.registrationCountry &&
    !!data.taxId &&
    taxIdValid &&
    !!data.role &&
    data.proteins.length >= 1 &&
    data.countriesOfOperation.length >= 1;

  // Progressive disclosure — once a section is revealed it stays revealed
  // even if the triggering field is cleared (so user doesn't lose work).
  const triggerTaxId = !!data.registrationCountry;
  const triggerRole = triggerTaxId && data.taxId.trim().length >= 3;
  const triggerProteins = triggerRole && !!data.role;
  const triggerCountries = triggerProteins && data.proteins.length >= 1;
  const triggerCerts = triggerCountries && data.countriesOfOperation.length >= 1;

  const [revealed, setRevealed] = useState({
    taxId: triggerTaxId,
    role: triggerRole,
    proteins: triggerProteins,
    countries: triggerCountries,
    certs: triggerCerts,
  });
  useEffect(() => {
    setRevealed((r) => ({
      taxId: r.taxId || triggerTaxId,
      role: r.role || triggerRole,
      proteins: r.proteins || triggerProteins,
      countries: r.countries || triggerCountries,
      certs: r.certs || triggerCerts,
    }));
  }, [triggerTaxId, triggerRole, triggerProteins, triggerCountries, triggerCerts]);

  const taxIdLabel = data.registrationCountry
    ? `${taxRule.label} — ${t("signup.fields.taxId")}`
    : t("signup.fields.taxId");

  const checks = [
    { key: "companyName", done: !!data.companyName, label: t("signup.fields.companyName") },
    { key: "registrationCountry", done: !!data.registrationCountry, label: t("signup.fields.registrationCountry") },
    { key: "taxId", done: !!data.taxId && taxIdValid, label: taxIdLabel },
    { key: "role", done: !!data.role, label: t("signup.fields.role") },
    { key: "proteins", done: data.proteins.length >= 1, label: t("signup.fields.proteinProfile") },
    { key: "countries", done: data.countriesOfOperation.length >= 1, label: t("signup.fields.countriesOfOperation") },
  ];
  const allDone = checks.every((c) => c.done);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={t("signup.fields.companyName")}>
          <input
            className={inputCls}
            value={data.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </Field>
        <RegistrationCountry
          value={data.registrationCountry}
          onChange={(v) => set("registrationCountry", v)}
        />
      </div>

      {revealed.taxId && (
        <div className="animate-fade-in">
          <Field label={taxIdLabel}>
            <input
              className={cn(
                inputCls,
                taxIdTouched && data.taxId && !taxIdValid && "border-red-500 focus:border-red-500 focus:ring-red-500",
              )}
              value={data.taxId}
              onChange={(e) => set("taxId", e.target.value)}
              onBlur={() => setTaxIdTouched(true)}
            />
            {taxIdTouched && data.taxId && !taxIdValid ? (
              <p className="text-xs text-red-500 mt-1">
                {t("signup.fields.taxIdError", { hint: taxRule.hint })}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">{taxRule.hint}</p>
            )}
          </Field>
        </div>
      )}

      {revealed.role && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("signup.fields.role")}
          </label>
          <div className="flex flex-wrap gap-3">
            {(["buyer", "supplier"] as const).map((r) => (
              <label
                key={r}
                className={cn(
                  "flex items-center gap-2 cursor-pointer text-sm rounded-lg border px-4 h-12 min-w-[140px]",
                  data.role === r
                    ? "border-[#B64769] bg-[#B64769]/5 text-[#B64769] font-medium"
                    : "border-gray-200 text-gray-700",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  checked={data.role === r}
                  onChange={() => set("role", r)}
                  className="h-4 w-4 accent-[#B64769]"
                />
                {t(`signup.fields.${r}`)}
              </label>
            ))}
          </div>
        </div>
      )}

      {revealed.proteins && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("signup.fields.proteinProfile")} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PROTEINS.map((p) => {
              const active = data.proteins.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    set(
                      "proteins",
                      active ? data.proteins.filter((x) => x !== p) : [...data.proteins, p],
                    )
                  }
                  className={cn(
                    "h-9 px-3 rounded-full text-sm border transition",
                    active
                      ? "bg-[#B64769] text-white border-[#B64769]"
                      : "bg-white text-gray-700 border-gray-200 hover:border-[#B64769]/60",
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {revealed.countries && (
        <div className="animate-fade-in">
          <CountriesOfOperation
            value={data.countriesOfOperation}
            onChange={(v) => set("countriesOfOperation", v)}
          />
        </div>
      )}

      {revealed.certs && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("signup.fields.licenses")}{" "}
            <span className="text-gray-400 font-normal">({t("common.optional")})</span>
          </label>
          {data.certificate ? (
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50">
              <span className="text-sm text-gray-700 truncate">{data.certificate.name}</span>
              <button onClick={() => onFile(null)} className="text-gray-500 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 py-8 cursor-pointer hover:bg-gray-100">
              <Upload className="h-6 w-6" style={{ color: WINE }} />
              <span className="text-sm text-gray-700">{t("signup.fields.uploadHint")}</span>
              <span className="text-xs text-gray-500">{t("signup.fields.uploadFormat")}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>
      )}

      {/* Always-visible checklist */}
      <div
        className={cn(
          "rounded-lg border p-4 transition-colors",
          allDone ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50",
        )}
      >
        <p
          className={cn(
            "text-sm font-medium mb-2",
            allDone ? "text-green-700" : "text-gray-700",
          )}
        >
          {allDone
            ? `✅ ${t("signup.checklist.allComplete")}`
            : t("signup.checklist.toComplete")}
        </p>
        {!allDone && (
          <ul className="space-y-1">
            {checks.map((c) => (
              <li
                key={c.key}
                className={cn(
                  "text-sm flex items-center gap-2",
                  c.done ? "text-gray-400 line-through" : "text-gray-700",
                )}
              >
                <span className={c.done ? "text-green-500" : "text-red-400"}>
                  {c.done ? "✓" : "○"}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-11 px-6 rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
        >
          {t("common.back")}
        </button>
        <button
          disabled={!canProceed}
          onClick={onNext}
          className={cn(
            "h-11 px-6 rounded-full text-sm font-medium transition",
            canProceed
              ? "bg-[#B64769] text-white hover:bg-[#8E3653]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed",
          )}
        >
          {t("common.proceed")}
        </button>
      </div>
    </div>
  );
}

/* --- Countries of Operation autocomplete (max 5) --- */
function CountriesOfOperation({
  value,
  onChange,
}: {
  value: { name: string; flag?: string }[];
  onChange: (v: { name: string; flag?: string }[]) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ name: string; flag?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("english_name, flag_emoji")
        .order("english_name");
      if (!mounted) return;
      setOptions(
        (data ?? []).map((c: any) => ({ name: c.english_name, flag: c.flag_emoji ?? "" })),
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selected = new Set(value.map((v) => v.name));
    const base = options.filter((o) => !selected.has(o.name));
    if (!q) return base.slice(0, 8);
    return base.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query, value]);

  const add = (c: { name: string; flag?: string }) => {
    if (value.length >= 5) {
      toast.error(t("signup.fields.countriesMax"));
      return;
    }
    onChange([...value, c]);
    setQuery("");
  };

  const remove = (name: string) => onChange(value.filter((v) => v.name !== name));

  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {t("signup.fields.countriesOfOperation")}
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((c) => (
            <span
              key={c.name}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#B64769]/10 text-[#B64769] text-sm"
            >
              <span>{c.flag || "🏳️"}</span>
              {c.name}
              <button
                type="button"
                onClick={() => remove(c.name)}
                className="ml-1 text-[#B64769]/70 hover:text-[#B64769]"
                aria-label="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {value.length < 5 ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className={cn(inputCls, "pl-10")}
            value={query}
            placeholder={t("signup.fields.countriesPlaceholder")}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => add(c)}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <span>{c.flag || "🏳️"}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
      <p className={cn("text-xs mt-1.5", value.length >= 5 ? "text-green-600" : "text-gray-500")}>
        {value.length >= 5
          ? t("signup.fields.countriesMaxReached", { defaultValue: "Maximum reached (5/5)" })
          : t("signup.fields.countriesHint")}
      </p>
    </div>
  );
}

/* --- Country of Registration (single select) --- */
function RegistrationCountry({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ name: string; flag?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("english_name, flag_emoji")
        .order("english_name");
      if (!mounted) return;
      setOptions(
        (data ?? []).map((c: any) => ({ name: c.english_name, flag: c.flag_emoji ?? "" })),
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = options.find((o) => o.name === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 8);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  return (
    <div ref={wrapRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {t("signup.fields.registrationCountry")}
      </label>
      {value ? (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 h-12 px-3 rounded-lg bg-[#B64769]/10 text-[#B64769] text-sm border border-[#B64769]/20">
            <span>{selected?.flag || "🏳️"}</span>
            {value}
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQuery("");
              }}
              className="ml-1 text-[#B64769]/70 hover:text-[#B64769]"
              aria-label="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className={cn(inputCls, "pl-10")}
            value={query}
            placeholder={t("signup.fields.registrationCountryPlaceholder")}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && filtered.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {filtered.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => {
                    onChange(c.name);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm"
                >
                  <span>{c.flag || "🏳️"}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------- STEP 4: BUSINESS CONTACT ----------------- */
function Step4Contact({
  data,
  set,
  onBack,
  onFinish,
  submitting,
}: {
  data: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onBack: () => void;
  onFinish: () => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [countryFromGoogle, setCountryFromGoogle] = useState(false);
  const canFinish =
    !!data.state &&
    !!data.city &&
    !!data.address &&
    !!data.zip &&
    !!data.country &&
    !!data.phoneNumber;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={t("signup.fields.address")}>
          <AddressAutocomplete
            className={inputCls}
            value={data.address}
            onChange={(v) => set("address", v)}
            onAddressSelect={(addr) => {
              set("address", addr.street || addr.formatted);
              if (addr.city) set("city", addr.city);
              if (addr.state) set("state", addr.state);
              if (addr.zip) set("zip", addr.zip);
              if (addr.country) {
                set("country", addr.country);
                setCountryFromGoogle(true);
              }
            }}
          />
        </Field>
        <Field label={t("signup.fields.addressLine2")}>
          <input
            className={inputCls}
            value={data.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
          />
        </Field>
        <Field label={t("signup.fields.city")}>
          <input
            className={inputCls}
            value={data.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </Field>
        <Field label={t("signup.fields.state")}>
          <input
            className={inputCls}
            value={data.state}
            onChange={(e) => set("state", e.target.value)}
            placeholder={t("signup.fields.statePlaceholder")}
          />
        </Field>
        <Field label={t("signup.fields.zip")}>
          <input
            className={inputCls}
            value={data.zip}
            onChange={(e) => set("zip", e.target.value)}
          />
        </Field>
        <Field
          label={
            <span className="flex items-center justify-between gap-2">
              <span>{t("signup.fields.country")}</span>
              {countryFromGoogle && (
                <button
                  type="button"
                  onClick={() => setCountryFromGoogle(false)}
                  className="text-xs font-medium hover:underline"
                  style={{ color: WINE }}
                >
                  ✎ {t("signup.fields.changeCountry")}
                </button>
              )}
            </span>
          }
        >
          <div className="relative">
            <input
              className={cn(
                inputCls,
                countryFromGoogle && "bg-gray-50 text-gray-700 cursor-not-allowed pr-10",
              )}
              value={data.country}
              onChange={(e) => set("country", e.target.value)}
              disabled={countryFromGoogle}
              title={countryFromGoogle ? t("signup.fields.countryLocked") : undefined}
            />
            {countryFromGoogle && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                🔒
              </span>
            )}
          </div>
        </Field>
        <Field label={t("signup.fields.businessPhone")}>
          <div className="flex gap-2">
            <select
              value={data.phoneCode}
              onChange={(e) => {
                const c = countryCodes.find((x) => x.code === e.target.value);
                set("phoneCode", e.target.value);
                if (c) set("phoneFlag", c.flag);
              }}
              className="h-12 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-[#B64769]"
            >
              {countryCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              className={inputCls}
              value={data.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value)}
              placeholder={t("signup.fields.phonePlaceholder")}
            />
          </div>
        </Field>
        <Field
          label={`${t("signup.fields.website")} (${t("common.optional")})`}
        >
          <input
            className={inputCls}
            value={data.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://"
          />
        </Field>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-11 px-6 rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
        >
          {t("common.back")}
        </button>
        <button
          disabled={!canFinish || submitting}
          onClick={onFinish}
          className={cn(
            "h-11 px-6 rounded-full text-sm font-medium transition",
            canFinish && !submitting
              ? "bg-[#B64769] text-white hover:bg-[#8E3653]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed",
          )}
        >
          {submitting ? t("common.submitting") : t("common.finish")}
        </button>
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */
function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}