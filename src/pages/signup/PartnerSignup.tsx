import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Legacy partner-signup entry point. The simplified flow is deprecated
 * because it never captured role / company / country, so approvals could
 * not link the user properly. Redirect to the full /signup with any
 * query params preserved.
 */
export default function PartnerSignup() {
  const [params] = useSearchParams();
  const qs = params.toString();
  return <Navigate to={`/signup${qs ? `?${qs}` : ""}`} replace />;
}
