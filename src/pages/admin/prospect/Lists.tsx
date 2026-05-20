import { ClipboardList, Plus } from "lucide-react";

export default function ProspectLists() {
  return (
    <div className="psp-page">
      <div className="psp-toolbar">
        <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Lists</div>
        <button className="psp-btn solid"><Plus size={12} />New list</button>
      </div>
      <div className="psp-empty" style={{ padding: 80 }}>
        <ClipboardList size={32} style={{ margin: "0 auto 12px", display: "block", color: "var(--adm-text-tertiary)" }} />
        <p style={{ marginBottom: 4, fontWeight: 600, color: "var(--adm-text)" }}>No lists yet</p>
        <p>Create lists to organize your prospects and contacts.</p>
      </div>
    </div>
  );
}
