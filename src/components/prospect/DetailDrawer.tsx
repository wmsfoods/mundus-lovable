import { X } from "lucide-react";
import type { ReactNode } from "react";

export function DetailDrawer({
  open, onClose, head, footer, children,
}: { open: boolean; onClose: () => void; head: ReactNode; footer?: ReactNode; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="psp-drawer-backdrop" onClick={onClose} />
      <aside className="psp-drawer" role="dialog" aria-modal="true">
        <div className="psp-drawer-head">
          {head}
          <button className="psp-drawer-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="psp-drawer-body">{children}</div>
        {footer && <div className="psp-drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}
