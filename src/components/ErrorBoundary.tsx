import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = () => {
    try {
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    } catch {
      /* noop */
    }
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;
    const msg = this.state.error?.message ?? "Unexpected error";
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#0b0b0f",
          color: "#f5f5f7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 8,
            }}
            aria-hidden
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
            Algo deu errado
          </h1>
          <p style={{ opacity: 0.7, fontSize: 14, margin: "0 0 20px" }}>
            {msg}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "#7a1f2b",
                color: "white",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Recarregar
            </button>
            <button
              onClick={this.handleHome}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                background: "transparent",
                color: "#f5f5f7",
                border: "1px solid rgba(255,255,255,0.2)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Início
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;