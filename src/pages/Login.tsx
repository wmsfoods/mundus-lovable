import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Globe, Snowflake, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Slide = {
  image: string;
  render: () => JSX.Element;
};

const slides: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-[28px] font-bold leading-tight whitespace-pre-line">
          {"Global Reach.\nReliable Supply.\nPremium Protein."}
        </h2>
        <div className="mt-10 grid grid-cols-4 gap-4 max-w-md">
          {[
            { icon: <Globe className="h-6 w-6" />, label: "Global Sourcing" },
            { icon: <Snowflake className="h-6 w-6" />, label: "Cold Chain" },
            { icon: <ShieldCheck className="h-6 w-6" />, label: "Food Safety" },
            { icon: <Truck className="h-6 w-6" />, label: "Reliable Delivery" },
          ].map((it) => (
            <div key={it.label} className="flex flex-col items-center text-center gap-2">
              {it.icon}
              <span className="text-xs">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <div className="text-sm font-medium" style={{ color: "#9B2251" }}>
          Global Protein Trading
        </div>
        <div className="mt-1 h-[2px] w-10" style={{ background: "#9B2251" }} />
        <p className="mt-4 text-base whitespace-pre-line">
          {"Connecting markets.\nDelivering quality."}
        </p>
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1611791484670-ce19b801d192?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-2xl font-bold whitespace-pre-line">
          {"From Trusted Sources\nto Global Markets"}
        </h2>
        <ul className="mt-6 space-y-2 text-base">
          {["Trusted Partnerships", "Quality Assurance", "Global Standards"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full border border-white" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-2xl font-bold whitespace-pre-line">
          {"Quality products.\nRigorous standards.\nGlobal solutions."}
        </h2>
        <div className="mt-3 h-[2px] w-8" style={{ background: "#9B2251" }} />
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-2xl font-bold whitespace-pre-line">
          {"Premium proteins.\nGlobal markets.\nEndless possibilities."}
        </h2>
        <div className="mt-3 h-[2px] w-8" style={{ background: "#9B2251" }} />
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-[28px] font-bold whitespace-pre-line">
          {"Local Presence.\nGlobal Connections."}
        </h2>
        <p className="mt-3 text-sm opacity-90">Building strong relationships across the world.</p>
        <div className="mt-6 flex gap-8">
          {[
            ["5", "Continents"],
            ["50+", "Countries"],
            ["100+", "Partners"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-bold">{n}</div>
              <div className="text-xs opacity-80">{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&auto=format&fit=crop",
    render: () => (
      <div className="text-white">
        <h2 className="text-2xl font-bold whitespace-pre-line">
          {"Global reach.\nReliable supply.\nTrusted partner."}
        </h2>
        <div className="mt-3 h-[2px] w-8" style={{ background: "#9B2251" }} />
      </div>
    ),
  },
];

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
      <div className="relative hidden md:block md:w-1/2 overflow-hidden">
        {slides.map((s, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              i === slide ? "opacity-100" : "opacity-0",
            )}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${s.image})` }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(100,0,30,0.85) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.3) 100%)",
              }}
            />
            <div className="absolute top-8 left-8">
              <Logo variant="white" />
            </div>
            <div className="absolute bottom-20 left-8 right-8">{s.render()}</div>
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
      <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="md:hidden mb-8 flex justify-center">
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