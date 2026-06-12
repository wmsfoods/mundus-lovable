import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailX, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Status = "loading" | "valid" | "success" | "invalid" | "error";

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const validationUrl = useMemo(() => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${baseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    let active = true;

    async function validateToken() {
      if (!token) {
        setStatus("invalid");
        setMessage("This unsubscribe link is missing a valid token.");
        return;
      }

      try {
        const response = await fetch(validationUrl, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.ok && data.valid) {
          setStatus("valid");
          setMessage("Confirm that you no longer want to receive Mundus Trade email notifications.");
        } else if (data.reason === "already_unsubscribed") {
          setStatus("success");
          setMessage("This email address is already unsubscribed.");
        } else {
          setStatus("invalid");
          setMessage("This unsubscribe link is invalid or expired.");
        }
      } catch {
        if (!active) return;
        setStatus("error");
        setMessage("We could not validate this unsubscribe link. Please try again.");
      }
    }

    validateToken();
    return () => {
      active = false;
    };
  }, [token, validationUrl]);

  const confirmUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });

      if (error) throw error;

      if (data?.success || data?.reason === "already_unsubscribed") {
        setStatus("success");
        setMessage("You have been unsubscribed from Mundus Trade email notifications.");
      } else {
        setStatus("error");
        setMessage("We could not complete your unsubscribe request. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("We could not complete your unsubscribe request. Please try again.");
    }
  };

  const Icon = status === "loading" ? Loader2 : status === "success" ? CheckCircle2 : status === "invalid" || status === "error" ? AlertTriangle : MailX;

  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className={status === "loading" ? "h-8 w-8 animate-spin" : "h-8 w-8"} />
        </div>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground">Email preferences</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{message || "Checking your unsubscribe link..."}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {status === "valid" && <Button onClick={confirmUnsubscribe}>Confirm unsubscribe</Button>}
          {status === "error" && <Button onClick={confirmUnsubscribe}>Try again</Button>}
          <Button variant="outline" asChild>
            <Link to="/login">Back to platform</Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Unsubscribe;