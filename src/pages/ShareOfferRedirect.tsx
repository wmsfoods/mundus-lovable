import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ShareOfferRedirect() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Mundus Offer";
  }, []);

  if (!id) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#6b7280", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  const target = `/buyer/offers/${id}`;
  if (user) return <Navigate to={target} replace />;
  return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
}