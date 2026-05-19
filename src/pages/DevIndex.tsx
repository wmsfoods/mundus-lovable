import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
import { toast } from "sonner";

type Row = { path: string; label: string; status: "ready" | "stub" | "auth" };

const ROUTES: { group: string; items: Row[] }[] = [
  {
    group: "Auth / Onboarding",
    items: [
      { path: "/login", label: "Login", status: "ready" },
      { path: "/signup", label: "Signup", status: "ready" },
      { path: "/signup/success", label: "Signup Success", status: "ready" },
      { path: "/signup/partner", label: "Partner Signup", status: "ready" },
    ],
  },
  {
    group: "Buyer",
    items: [
      { path: "/buyer", label: "Buyer Home", status: "ready" },
      { path: "/buyer/offers", label: "Offers (marketplace)", status: "ready" },
      { path: "/buyer/offers/:id", label: "Offer Detail (pick from list)", status: "ready" },
      { path: "/buyer/requests", label: "My Offer Requests", status: "stub" },
      { path: "/buyer/requests/new", label: "Create Request", status: "stub" },
      { path: "/buyer/orders", label: "Orders", status: "stub" },
      { path: "/buyer/negotiations", label: "Negotiations", status: "stub" },
      { path: "/buyer/users", label: "Users", status: "stub" },
    ],
  },
  {
    group: "Supplier",
    items: [
      { path: "/supplier", label: "Supplier Home", status: "ready" },
      { path: "/supplier/offers", label: "My Offers", status: "ready" },
      { path: "/supplier/offers/:id", label: "Offer Detail (pick from list)", status: "ready" },
      { path: "/supplier/offers/new", label: "Create Offer", status: "stub" },
      { path: "/supplier/sales", label: "Sales", status: "ready" },
      { path: "/supplier/sales/:id", label: "Sale Detail (pick from list)", status: "ready" },
      { path: "/supplier/negotiations", label: "Negotiations", status: "stub" },
      { path: "/supplier/requests", label: "Offer Requests", status: "ready" },
      { path: "/supplier/requests/:id", label: "Offer Request Detail (pick from list)", status: "ready" },
      { path: "/supplier/users", label: "Users", status: "stub" },
    ],
  },
  {
    group: "Legacy / Misc",
    items: [
      { path: "/dashboard", label: "Old Dashboard (fallback)", status: "ready" },
      { path: "/__notfound", label: "404 Page", status: "ready" },
    ],
  },
];

const badgeStyle: Record<Row["status"], React.CSSProperties> = {
  ready: { background: "#E6F6EC", color: "#1E7A3C" },
  stub: { background: "#FEF2D6", color: "#8A5A00" },
  auth: { background: "#EEF1FF", color: "#3A47B5" },
};

export default function DevIndex() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { company } = useCurrentCompany();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F8", padding: "40px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111", margin: 0 }}>
          Dev Index — todas as telas
        </h1>
        <p style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
          Atalho de navegação pro admin. <strong>ready</strong> = tela construída,{" "}
          <strong>stub</strong> = rota ainda não criada (cai no 404).
        </p>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: user ? "#E6F6EC" : "#FEECEC",
            border: `1px solid ${user ? "#B7E3C4" : "#F2C1C1"}`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 14, color: "#222" }}>
            {authLoading ? (
              "Carregando sessão..."
            ) : user ? (
              <>
                <strong>Logado</strong> como <code>{user.email}</code>
                {company ? (
                  <>
                    {" "}— empresa <strong>{company.name}</strong>{" "}
                    {company.is_buyer && <span>· buyer</span>}{" "}
                    {company.is_supplier && <span>· supplier</span>}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <strong>Você NÃO está logado.</strong> Todas as rotas protegidas vão te
                redirecionar pro <code>/login</code>. Faça login primeiro.
              </>
            )}
          </div>
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                toast.success("Signed out");
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #B64769",
                color: "#B64769",
                background: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "none",
                color: "#fff",
                background: "#B64769",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ir para Login
            </button>
          )}
        </div>

        <div style={{ marginTop: 28, display: "grid", gap: 20 }}>
          {ROUTES.map((g) => (
            <section
              key={g.group}
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #ECECEE",
                padding: 20,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  color: "#888",
                  margin: 0,
                }}
              >
                {g.group}
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
                {g.items.map((r) => {
                  const navigable = !r.path.includes(":") && r.path !== "/__notfound";
                  const target = r.path === "/__notfound" ? "/this-route-does-not-exist" : r.path;
                  return (
                    <li
                      key={r.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderTop: "1px solid #F2F2F4",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span
                          style={{
                            ...badgeStyle[r.status],
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 999,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          {r.status}
                        </span>
                        <span style={{ fontSize: 14, color: "#222" }}>{r.label}</span>
                        <code
                          style={{
                            fontSize: 12,
                            color: "#888",
                            background: "#F4F4F6",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {r.path}
                        </code>
                      </div>
                      {navigable || r.path === "/__notfound" ? (
                        <Link
                          to={target}
                          style={{
                            fontSize: 13,
                            color: "#B64769",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          abrir →
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: "#BBB" }}>requer id</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}