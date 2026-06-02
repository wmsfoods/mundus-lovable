import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import MobileWelcomeOnboarding from "@/components/onboarding/MobileWelcomeOnboarding";
import { usePreLoginOnboarding, type PreLoginRole } from "@/hooks/usePreLoginOnboarding";
import { isNativeApp } from "@/lib/isNativeApp";

export default function MobileWelcome() {
  const navigate = useNavigate();
  const { isNative, loading, done, complete } = usePreLoginOnboarding();

  useEffect(() => {
    if (loading) return;
    if (!isNative || done) {
      navigate("/home", { replace: true });
    }
  }, [loading, isNative, done, navigate]);

  if (!isNative) {
    return <Navigate to="/home" replace />;
  }

  if (loading || done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 rounded-full border-2 border-[#B64769] border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleComplete = async (role: PreLoginRole) => {
    await complete(role);
    navigate("/home", { replace: true });
  };

  return <MobileWelcomeOnboarding onComplete={handleComplete} />;
}
