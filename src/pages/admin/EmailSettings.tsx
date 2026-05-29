import "@/styles/mundus-outreach.css";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const ACCOUNTS: { user: string; provider: string; from: string; status: string }[] = [];

const USERS: string[] = [];

export default function EmailSettings() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("zoho");
  return (
    <div className="out-page">
      <div>
        <h1 className="out-h1">Email Settings</h1>
        <p className="out-sub">Manage email sending accounts</p>
      </div>
      <div className="out-card">
        <h3 className="out-card-title">System Default</h3>
        <div className="out-sysdef">
          <div className="out-sysdef-logo">Z</div>
          <div className="out-sysdef-info">
            <div className="out-item-meta"><strong>Provider:</strong> Zoho</div>
            <div className="out-item-meta"><strong>From:</strong> contact@mundustrade.com</div>
            <span className="out-pill sent" style={{ width: "fit-content" }}>Active</span>
          </div>
          <div className="out-sysdef-actions">
            <Button size="sm" variant="outline" onClick={() => toast.success("Connection OK")}>Test Connection</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Editor coming soon")}>Edit</Button>
          </div>
        </div>
      </div>
      <div className="out-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="out-card-title" style={{ margin: 0 }}>User Accounts</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="out-btn-wine">+ Connect</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect Email Account</DialogTitle></DialogHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <Label>User</Label>
                  <Select><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>{USERS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Provider</Label>
                  <RadioGroup value={provider} onValueChange={setProvider} className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2"><RadioGroupItem value="zoho" /> Zoho</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="microsoft" /> Microsoft</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="smtp" /> SMTP</label>
                  </RadioGroup>
                </div>
                <div><Label>From address</Label><Input placeholder="name@yourdomain.com" /></div>
                <div><Label>Display name</Label><Input placeholder="Your name" /></div>
                {provider === "smtp" && (
                  <>
                    <div><Label>SMTP host</Label><Input placeholder="smtp.example.com" /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div><Label>Port</Label><Input type="number" placeholder="587" /></div>
                      <div><Label>Username</Label><Input /></div>
                    </div>
                    <div><Label>Password</Label><Input type="password" /></div>
                  </>
                )}
                {(provider === "zoho" || provider === "microsoft") && (
                  <div className="out-sub">You will be redirected to {provider === "zoho" ? "Zoho" : "Microsoft"} to authorize access.</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button style={{ background: "#8B2252", color: "#fff" }} onClick={() => { toast.success("Account connected (mock)"); setOpen(false); }}>Connect</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {ACCOUNTS.length === 0 ? (
          <div className="out-empty" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 600, color: "#475569", marginBottom: 4 }}>No user accounts connected</div>
            <div style={{ fontSize: 14 }}>Click "+ Connect" to link an email provider.</div>
          </div>
        ) : (
          <>
            <div className="out-desktop-only out-table-wrap">
              <table className="out-table">
                <thead><tr><th>User</th><th>Provider</th><th>From</th><th>Status</th></tr></thead>
                <tbody>
                  {ACCOUNTS.map((a) => (
                    <tr key={a.user}>
                      <td>{a.user}</td>
                      <td><span className="out-badge cat">{a.provider}</span></td>
                      <td>{a.from}</td>
                      <td><span className="out-pill sent">{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="out-mobile-only out-list">
              {ACCOUNTS.map((a) => (
                <div key={a.user} className="out-item">
                  <div className="out-item-head">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="out-item-title">{a.user}</div>
                      <div className="out-rec-mini-sub">{a.from}</div>
                    </div>
                    <span className="out-pill sent">{a.status}</span>
                  </div>
                  <div className="out-item-meta">
                    <span className="out-badge cat">{a.provider}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}