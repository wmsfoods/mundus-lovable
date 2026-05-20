export type ActiveRole = "buyer" | "supplier";
const KEY = "mundus.activeRole";

export function getActiveRole(): ActiveRole | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "buyer" || v === "supplier" ? v : null;
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
