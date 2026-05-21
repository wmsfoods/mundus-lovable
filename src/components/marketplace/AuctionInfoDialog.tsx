import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

const ITEMS: Array<{ icon: string; title: string; body: string }> = [
  { icon: "🔨", title: "What is an auction?", body: "Suppliers post products with a bidding window. You place one sealed bid — no one sees your price." },
  { icon: "🔒", title: "Sealed bidding", body: "Your bid is private. Other buyers can't see it. The supplier sees all bids only after the window closes." },
  { icon: "⏱️", title: "Timing", body: "Each auction has a fixed window (e.g., opens Monday, closes Wednesday). Place your bid before time runs out." },
  { icon: "📝", title: "One bid, one chance", body: "You can't modify your bid once placed. If you made an error, you can withdraw — but there's a 4-hour cooldown before you can re-enter." },
  { icon: "🏆", title: "Award", body: "After the window closes, the supplier reviews all bids and picks a winner. You'll be notified of the result." },
  { icon: "📊", title: "Results", body: "After award, you can see how your bid compared to the winner (in $/kg and %)." },
];

export function AuctionInfoDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="auct-info-link">
          <Info size={14} /> How do auctions work?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How Sealed-Bid Auctions Work</DialogTitle>
        </DialogHeader>
        <ul className="auct-info-list">
          {ITEMS.map((it) => (
            <li key={it.title}>
              <span className="auct-info-emoji" aria-hidden>{it.icon}</span>
              <div>
                <div className="auct-info-title">{it.title}</div>
                <div className="auct-info-body">{it.body}</div>
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export default AuctionInfoDialog;