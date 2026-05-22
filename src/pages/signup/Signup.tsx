import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Upload, Search, X, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { SignupShell } from "./SignupShell";
import { PasswordRequirements } from "./PasswordRequirements";
import { allRulesMet, checkPassword } from "./passwordRules";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AddressAutocomplete } from "@/components/mundus/AddressAutocomplete";

const MUNDUS_TRADE_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

const inputCls =
  "h-12 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#B64769] focus:ring-1 focus:ring-[#B64769] bg-white";

const countryCodes = [
  { code: "+1", flag: "🇺🇸", country: "US" },
  { code: "+55", flag: "🇧🇷", country: "BR" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+34", flag: "🇪🇸", country: "ES" },
  { code: "+86", flag: "🇨🇳", country: "CN" },
  { code: "+52", flag: "🇲🇽", country: "MX" },
  { code: "+54", flag: "🇦🇷", country: "AR" },
];

type FormData = {
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
  agreeTerms: boolean;
  companyName: string;
  cnpj: string;
  isBuyer: boolean;
  isSupplier: boolean;
  certificate: File | null;
  countryOp: string;
  state: string;
  address: string;
  addressLine2: string;
  country: string;
  phoneCode: string;
  phoneFlag: string;
  phoneNumber: string;
  confirm: boolean;
};

const initial: FormData = {
  name: "",
  email: "",
  password: "",
  repeatPassword: "",
  agreeTerms: false,
  companyName: "",
  cnpj: "",
  isBuyer: false,
  isSupplier: false,
  certificate: null,
  countryOp: "",
  state: "",
  address: "",
  addressLine2: "",
  country: "",
  phoneCode: "+1",
  phoneFlag: "🇺🇸",
  phoneNumber: "",
  confirm: false,
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
    t("signup.steps.company"),
    t("signup.steps.review"),
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

  return (
    <SignupShell onBack={handleMobileBack}>
      <div className="bg-white rounded-2xl shadow-sm p-10">
        <h2 className="text-2xl font-bold text-center text-[#111]">{t("signup.title")}</h2>
        <p className="text-xs text-gray-500 text-center mt-1">
          {t("signup.stepOf", { current: step, total: 3 })}
        </p>
        <p className="text-base font-bold text-center mt-1" style={{ color: "#B64769" }}>
          {stepNames[step - 1]}
        </p>

        {/* progress bar */}
        <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%`, background: "#B64769" }}
          />
        </div>

        <div className="mt-8">
          {step === 1 && <Step1 data={data} set={set} onNext={() => setStep(2)} />}
          {step === 2 && (
            <Step2 data={data} set={set} onBack={() => setStep(1)} onNext={() => setStep(3)} />
          )}
          {step === 3 && (
            <Step3
              data={data}
              set={set}
              onBack={() => setStep(2)}
              onFinish={handleFinish}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </SignupShell>
  );
}

/* ----------------- STEP 1 ----------------- */
function Step1({
  data,
  set,
  onNext,
}: {
  data: FormData;
  set: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const [showP, setShowP] = useState(false);
  const [showR, setShowR] = useState(false);
  const rules = useMemo(() => checkPassword(data.password), [data.password]);
  const passwordsMatch = data.password === data.repeatPassword && data.password.length > 0;
  const canProceed =
    data.name &&
    data.email &&
    passwordsMatch &&
    allRulesMet(rules) &&
    data.agreeTerms;

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
          <a href="#" className="underline" style={{ color: "#B64769" }}>
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

/* ----------------- STEP 2 ----------------- */
function Step2({
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
  const onFile = (f: File | null) => {
    if (f && f.size > 5 * 1024 * 1024) {
      toast.error(t("signup.fileTooLarge"));
      return;
    }
    set("certificate", f);
  };

  const canProceed =
    data.companyName &&
    data.cnpj &&
    (data.isBuyer || data.isSupplier) &&
    data.countryOp &&
    data.state &&
    data.address &&
    data.country &&
    data.phoneNumber;

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
        <Field label={t("signup.fields.cnpj")}>
          <input className={inputCls} value={data.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
        </Field>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t("signup.fields.role")}</label>
        <div className="flex gap-8">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={data.isBuyer}
              onChange={(e) => set("isBuyer", e.target.checked)}
              className="h-4 w-4 accent-[#B64769]"
            />
            {t("signup.fields.buyer")}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={data.isSupplier}
              onChange={(e) => set("isSupplier", e.target.checked)}
              className="h-4 w-4 accent-[#B64769]"
            />
            {t("signup.fields.supplier")}
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("signup.fields.licenses")} <span className="text-gray-400 font-normal">({t("common.optional")})</span>
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
            <Upload className="h-6 w-6" style={{ color: "#B64769" }} />
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label={t("signup.fields.countryOp")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className={cn(inputCls, "pl-10")}
              value={data.countryOp}
              onChange={(e) => set("countryOp", e.target.value)}
              placeholder={t("signup.fields.countryOpPlaceholder")}
            />
          </div>
        </Field>
        <Field label={t("signup.fields.state")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className={cn(inputCls, "pl-10")}
              value={data.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder={t("signup.fields.statePlaceholder")}
            />
          </div>
        </Field>
        <Field label={t("signup.fields.address")}>
          <AddressAutocomplete
            className={inputCls}
            value={data.address}
            onChange={(v) => set("address", v)}
            onAddressSelect={(addr) => {
              set("address", addr.street || addr.formatted);
              if (addr.state) set("state", addr.state);
              if (addr.country) set("country", addr.country);
              if (addr.countryCode) set("countryOp", addr.countryCode);
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
        <Field label={t("signup.fields.country")}>
          <input
            className={inputCls}
            value={data.country}
            onChange={(e) => set("country", e.target.value)}
          />
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

/* ----------------- STEP 3 ----------------- */
function Step3({
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
  const role =
    data.isBuyer && data.isSupplier
      ? t("signup.roles.both")
      : data.isBuyer
        ? t("signup.roles.buyer")
        : data.isSupplier
          ? t("signup.roles.supplier")
          : t("signup.roles.none");

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-bold text-[#111] mb-4">{t("signup.reviewSections.basic")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReviewItem label={t("signup.reviewLabels.fullName")} value={data.name} />
          <ReviewItem label={t("signup.reviewLabels.email")} value={data.email} />
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-[#111] mb-4">{t("signup.reviewSections.company")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReviewItem label={t("signup.reviewLabels.companyName")} value={data.companyName} />
          <ReviewItem label={t("signup.reviewLabels.cnpj")} value={data.cnpj} />
          <ReviewItem label={t("signup.reviewLabels.role")} value={role} />
          <div>
            <div className="text-xs text-gray-500 mb-1">{t("signup.reviewLabels.licenses")}</div>
            {data.certificate ? (
              <div className="flex items-center gap-2 text-sm text-gray-800">
                <Download className="h-4 w-4" style={{ color: "#B64769" }} />
                <span className="truncate">{data.certificate.name}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-400">—</div>
            )}
          </div>
          <ReviewItem label={t("signup.reviewLabels.countryOp")} value={data.countryOp} />
          <ReviewItem label={t("signup.reviewLabels.state")} value={data.state} />
          <ReviewItem label={t("signup.reviewLabels.address")} value={data.address} />
          <ReviewItem label={t("signup.reviewLabels.addressLine2")} value={data.addressLine2 || "—"} />
          <ReviewItem label={t("signup.reviewLabels.country")} value={data.country} />
          <ReviewItem label={t("signup.reviewLabels.businessPhone")} value={`${data.phoneFlag} ${data.phoneCode} ${data.phoneNumber}`} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={data.confirm}
          onChange={(e) => set("confirm", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#B64769]"
        />
        <span>{t("signup.confirmInfo")}</span>
      </label>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="h-11 px-6 rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
        >
          {t("common.back")}
        </button>
        <button
          disabled={!data.confirm || submitting}
          onClick={onFinish}
          className={cn(
            "h-11 px-6 rounded-full text-sm font-medium transition",
            data.confirm && !submitting
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}