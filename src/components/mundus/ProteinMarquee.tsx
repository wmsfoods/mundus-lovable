import React from "react";

const PROTEIN_IMAGES = [
  { src: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=250&fit=crop", label: "Beef" },
  { src: "https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=250&fit=crop", label: "Steaks" },
  { src: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=250&fit=crop", label: "Poultry" },
  { src: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=250&fit=crop", label: "Pork" },
  { src: "https://images.unsplash.com/photo-1608039829572-25e8182a7290?w=400&h=250&fit=crop", label: "Lamb" },
  { src: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&h=250&fit=crop", label: "Seafood" },
  { src: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=250&fit=crop", label: "Beef ribs" },
  { src: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=250&fit=crop", label: "Mixed meat" },
  { src: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=250&fit=crop", label: "Tenderloin" },
  { src: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=250&fit=crop", label: "Grilled" },
];

const STYLES = `
@keyframes protein-marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.protein-marquee-wrap {
  position: relative;
  overflow: hidden;
  flex: 1;
  min-width: 0;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%);
}
.protein-marquee-track {
  display: flex;
  gap: 16px;
  width: max-content;
  animation: protein-marquee-scroll 35s linear infinite;
}
.protein-marquee-wrap:hover .protein-marquee-track {
  animation-play-state: paused;
}
.protein-marquee-card {
  flex-shrink: 0;
  width: 200px;
  height: 140px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(0,0,0,0.25);
  background: rgba(255,255,255,0.08);
}
.protein-marquee-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
@media (max-width: 768px) {
  .protein-marquee-wrap { display: none; }
}
`;

export function ProteinMarquee({ className = "" }: { className?: string }) {
  const images = [...PROTEIN_IMAGES, ...PROTEIN_IMAGES];
  return (
    <div className={`protein-marquee-wrap ${className}`} aria-hidden="true">
      <style>{STYLES}</style>
      <div className="protein-marquee-track">
        {images.map((img, i) => (
          <div key={i} className="protein-marquee-card">
            <img src={img.src} alt={img.label} loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProteinMarquee;