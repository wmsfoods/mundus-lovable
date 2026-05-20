export type ActiveRole = "buyer" | "supplier" | "admin";
const KEY = "mundus.activeRole";

export function getActiveRole(): ActiveRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "buyer" || v === "supplier" || v === "admin" ? v : null;
  } catch {
    return null;
  }
}

export function setActiveRole(role: ActiveRole) {
  try {
    localStorage.setItem(KEY, role);
  } catch {
    /* ignore */
  }
}
