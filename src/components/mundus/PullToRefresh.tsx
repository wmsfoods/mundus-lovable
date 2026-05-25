import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 110;

interface Props {
  children: ReactNode;
  enabled?: boolean;
}

/**
 * Mobile pull-to-refresh wrapper. Triggers react-query refetch and
 * dispatches an `app:pull-refresh` window event so pages can react.
 */
export function PullToRefresh({ children, enabled = true }: Props) {
  const queryClient = useQueryClient();
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      // Only when scrolled to top
      const scroller = document.scrollingElement || document.documentElement;
      if (scroller.scrollTop > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve
      const eased = Math.min(MAX_PULL, dy * 0.5);
      setPull(eased);
      if (dy > 6 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const shouldRefresh = pull >= THRESHOLD;
      startY.current = null;
      if (shouldRefresh && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          window.dispatchEvent(new CustomEvent("app:pull-refresh"));
          await queryClient.invalidateQueries();
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 400);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, pull, refreshing, queryClient]);

  const progress = Math.min(1, pull / THRESHOLD);
  const rotation = progress * 270;

  return (
    <div ref={containerRef} className="ptr-root" style={{ position: "relative" }}>
      <div
        className="ptr-indicator"
        aria-hidden={!pull && !refreshing}
        style={{
          opacity: pull > 4 || refreshing ? 1 : 0,
          transform: `translate(-50%, ${pull - 40}px)`,
        }}
      >
        <RefreshCw
          size={18}
          style={{
            transform: `rotate(${refreshing ? 0 : rotation}deg)`,
            animation: refreshing ? "ptr-spin 0.8s linear infinite" : undefined,
          }}
        />
      </div>
      <div
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pull === 0 ? "transform 220ms ease" : undefined,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}