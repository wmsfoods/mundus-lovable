import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b bg-white">
        <Logo />
        <button
          onClick={handleLogout}
          className="h-10 px-5 rounded-full border border-[#9B2251] text-[#9B2251] text-sm font-medium hover:bg-[#9B2251]/5"
        >
          Log out
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard — Coming Soon</h1>
        {user?.email && (
          <p className="mt-2 text-muted-foreground text-sm">Signed in as {user.email}</p>
        )}
      </main>
    </div>
  );
}