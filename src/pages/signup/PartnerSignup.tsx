import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { SignupShell } from "./SignupShell";
import { PasswordRequirements } from "./PasswordRequirements";
import { allRulesMet, checkPassword } from "./passwordRules";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MUNDUS_TRADE_COMPANY_ID = "00000000-0000-beef-0000-000000000001";

const inputCls =
  "h-12 w-full rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#9B2251] focus:ring-1 focus:ring-[#9B2251] bg-white";

export default function PartnerSignup() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const companyName = params.get("company") ?? "Mundus Trade";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [agree, setAgree] = useState(false);
  const [showP, setShowP] = useState(false);
  const [showR, setShowR] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rules = useMemo(() => checkPassword(password), [password]);
  const match = password === repeat && password.length > 0;
  const can = name && email && match && allRulesMet(rules) && agree;

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    const { error: reqErr } = await supabase.from("user_requests").insert({
      company_id: MUNDUS_TRADE_COMPANY_ID,
      name,
      email,
      status: "pending",
    });
    setSubmitting(false);
    if (reqErr) {
      toast.error(reqErr.message);
      return;
    }
    navigate(`/signup/success?email=${encodeURIComponent(email)}`);
  };

  return (
    <SignupShell>
      <div className="bg-white rounded-2xl shadow-sm p-10">
        <h2 className="text-2xl font-bold text-center text-[#111]">
          Sign Up via{" "}
          <span style={{ color: "#9B2251" }} className="font-bold">
            {companyName}
          </span>{" "}
          Partner
        </h2>

        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Full name</label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showP ? "text" : "password"}
                  className={cn(inputCls, "pr-12")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowP((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showP ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Repeat password</label>
              <div className="relative">
                <input
                  type={showR ? "text" : "password"}
                  className={cn(inputCls, "pr-12")}
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowR((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showR ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {repeat && !match && (
                <p className="text-red-500 text-sm mt-1">Passwords do not match.</p>
              )}
            </div>
          </div>

          <PasswordRequirements rules={rules} />

          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#9B2251]"
            />
            <span>
              I declare that I have read and agree to the{" "}
              <a href="#" className="underline" style={{ color: "#9B2251" }}>
                Terms and Conditions
              </a>
            </span>
          </label>

          <div className="flex gap-3">
            <Link
              to="/login"
              className="h-11 px-6 inline-flex items-center justify-center rounded-full border border-[#9B2251] text-[#9B2251] bg-white hover:bg-[#9B2251]/5 text-sm font-medium"
            >
              Cancel
            </Link>
            <button
              disabled={!can || submitting}
              onClick={submit}
              className={cn(
                "h-11 px-6 rounded-full text-sm font-medium transition",
                can && !submitting
                  ? "bg-[#9B2251] text-white hover:bg-[#7a1a3f]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed",
              )}
            >
              {submitting ? "Submitting..." : "Complete"}
            </button>
          </div>
        </div>
      </div>
    </SignupShell>
  );
}