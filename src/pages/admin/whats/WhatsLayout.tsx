import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { MessageCircle, Users, ListTodo, Zap, BarChart3, Settings } from "lucide-react";
import { useIsMundusAdmin } from "@/hooks/useIsMundusAdmin";
import "@/styles/mundus-whats.css";

const TABS = [
  { to: "/admin/whats/conversas", label: "Conversas", icon: MessageCircle },
  { to: "/admin/whats/contatos", label: "Contatos", icon: Users },
  { to: "/admin/whats/tarefas", label: "Tarefas", icon: ListTodo },
  { to: "/admin/whats/macros", label: "Macros", icon: Zap },
  { to: "/admin/whats/analises", label: "Análises", icon: BarChart3 },
  { to: "/admin/whats/configuracoes", label: "Configurações", icon: Settings },
];

export default function WhatsLayout() {
  const { isAdmin, loading } = useIsMundusAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/", { replace: true });
  }, [loading, isAdmin, navigate]);

  if (loading) return <div className="mw-page">Carregando…</div>;
  if (!isAdmin) return null;

  return (
    <div className="mw-page">
      <div className="mw-header">
        <div>
          <h1>Mundus Whats</h1>
          <p>Central de atendimento WhatsApp da Mundus — conversas, equipe e automações.</p>
        </div>
      </div>
      <nav className="mw-tabs">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              <I size={14} />
              {t.label}
            </NavLink>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}