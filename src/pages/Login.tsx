import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import slide1 from "@/assets/login-carousel-1.png";
import slide2 from "@/assets/login-carousel-2.png";
import slide3 from "@/assets/login-carousel-3.png";
import slide4 from "@/assets/login-carousel-4.png";
import slide5 from "@/assets/login-carousel-5.png";
import slide6 from "@/assets/login-carousel-6.png";
import slide7 from "@/assets/login-carousel-7.png";

const slides: string[] = [slide1, slide2, slide3, slide4, slide5, slide6, slide7];

export default function Login() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* LEFT - carousel */}
      <div className="relative hidden md:block md:w-[70%] overflow-hidden">
        {slides.map((src, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              i === slide ? "opacity-100" : "opacity-0",
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${src})` }}
            />
          </div>
        ))}
        {/* dots */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === slide ? "w-8" : "w-1.5 bg-white/40",
              )}
              style={i === slide ? { background: "#9B2251" } : undefined}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* RIGHT - form */}
      <div className="flex w-full md:w-[30%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-[28px] font-bold text-[#111]">Log in</h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm text-[#333] mb-1.5">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 text-sm outline-none focus:border-[#9B2251] focus:ring-1 focus:ring-[#9B2251]"
              />
            </div>

            <div>
              <label className="block text-sm text-[#333] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-lg border border-[#E0E0E0] px-4 pr-12 text-sm outline-none focus:border-[#9B2251] focus:ring-1 focus:ring-[#9B2251]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#333] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#9B2251]"
                />
                Remember me
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 w-32 rounded-full bg-[#9B2251] text-white text-sm font-medium hover:bg-[#7a1a3f] transition disabled:opacity-60"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#9B2251] font-semibold">
              Sign up
            </Link>
          </p>

          <div className="mt-12 flex justify-center gap-6 text-xs text-gray-400">
            <a href="#" className="underline">Terms and Condition</a>
            <a href="#" className="underline">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}