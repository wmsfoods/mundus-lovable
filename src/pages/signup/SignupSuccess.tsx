import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { SignupShell } from "./SignupShell";
import { supabase } from "@/integrations/supabase/client";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export default function SignupSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get("email") ?? "";

  const resend = async () => {
    if (!email) {
      toast.error("Missing email");
      return;
    }
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error(error.message);
    else toast.success("Verification code resent");
  };

  return (
    <SignupShell title="Confirm Email">
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
        <div className="flex justify-center">
          <div className="relative">
            <Mail className="h-20 w-20" style={{ color: "#B64769" }} strokeWidth={1.5} />
            <CheckCircle
              className="absolute -bottom-1 -right-1 h-8 w-8 bg-white rounded-full"
              style={{ color: "#B64769" }}
              strokeWidth={2}
            />
          </div>
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#111]">Registration completed successfully!</h2>
        <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto">
          To activate your account, a verification code has been sent to the email address{" "}
          <span className="font-medium text-gray-700">{maskEmail(email)}</span>.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={resend}
            className="h-11 px-6 rounded-full border border-[#B64769] text-[#B64769] bg-white hover:bg-[#B64769]/5 text-sm font-medium"
          >
            Resend code
          </button>
          <button
            onClick={() => navigate("/login")}
            className="h-11 px-6 rounded-full bg-[#B64769] text-white hover:bg-[#8E3653] text-sm font-medium"
          >
            Enter code
          </button>
        </div>
      </div>
    </SignupShell>
  );
}