import { useEffect, useRef, useState, useCallback } from "react";

export type GalleryImage = { id: string; src: string; label: string };

type Props = {
  images: GalleryImage[];
  illustrativeLabel?: string;
};

/**
 * Offer image gallery used in buyer & supplier offer detail.
 * - Main carousel auto-advances (pauses on interaction)
 * - Arrows on desktop, swipe on mobile
 * - Thumbnails below navigate to slide
 * - Click on main image opens full-size lightbox
 */
export function OfferImageGallery({ images, illustrativeLabel }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (images.length < 2 || userPaused) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % images.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(t);
  }, [images.length, userPaused]);

  const scrollTo = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(images.length - 1, i));
      el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    },
    [images.length],
  );

  const pause = () => { if (!userPaused) setUserPaused(true); };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : Math.min(images.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  if (images.length === 0) {
    return (
      <div className="od-gallery">
        <div className="od-gallery-main">
          <div className="od-gallery-placeholder">
            {illustrativeLabel && <span className="od-illu-label">{illustrativeLabel}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="od-gallery">
      <div className="od-gallery-main od-gallery-carousel">
        <div
          className="od-gallery-scroller"
          ref={scrollerRef}
          onScroll={onScroll}
          onPointerDown={pause}
          onWheel={pause}
        >
          {images.map((im, i) => (
            <div
              key={im.id}
              className="od-gallery-slide"
              onClick={() => setLightbox(i)}
              role="button"
              aria-label={`Open ${im.label}`}
            >
              <img src={im.src} alt={im.label} />
            </div>
          ))}
        </div>
        {illustrativeLabel && (
          <span className="od-illu-label od-illu-label-overlay">{illustrativeLabel}</span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="od-gallery-nav prev"
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); pause(); scrollTo(idx - 1); }}
              disabled={idx === 0}
            >‹</button>
            <button
              type="button"
              className="od-gallery-nav next"
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); pause(); scrollTo(idx + 1); }}
              disabled={idx === images.length - 1}
            >›</button>
            <div className="od-gallery-dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  className={`od-gallery-dot ${i === idx ? "on" : ""}`}
                  onClick={(e) => { e.stopPropagation(); pause(); scrollTo(i); }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="od-gallery-thumbs">
          {images.map((im, i) => (
            <button
              key={im.id}
              type="button"
              className={`od-thumb ${i === idx ? "on" : ""}`}
              onClick={() => { pause(); scrollTo(i); }}
              aria-label={`Show ${im.label}`}
            >
              <img src={im.src} alt={im.label} />
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && (
        <div className="od-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <button
            type="button"
            className="od-lightbox-close"
            aria-label="Close"
            onClick={() => setLightbox(null)}
          >×</button>
          {images.length > 1 && (
            <button
              type="button"
              className="od-lightbox-nav prev"
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.max(0, i - 1))); }}
              disabled={lightbox === 0}
            >‹</button>
          )}
          <figure className="od-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={images[lightbox].src} alt={images[lightbox].label} />
            <figcaption>{images[lightbox].label}</figcaption>
          </figure>
          {images.length > 1 && (
            <button
              type="button"
              className="od-lightbox-nav next"
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.min(images.length - 1, i + 1))); }}
              disabled={lightbox === images.length - 1}
            >›</button>
          )}
        </div>
      )}
    </div>
  );
}