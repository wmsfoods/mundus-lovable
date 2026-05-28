import "./hero-marquee.css";

const PROTEIN_SRCS = [
  "/assets/proteins/chuck.png",
  "/assets/proteins/d-rump.png",
  "/assets/proteins/pork-loin-boneless.png",
  "/assets/proteins/chicken-feet.png",
  "/assets/proteins/eye-round.png",
  "/assets/proteins/golden-coin.png",
  "/assets/proteins/pork-chops.png",
  "/assets/proteins/chicken-drumette.png",
  "/assets/proteins/knuckles.png",
  "/assets/proteins/pork-loin-bone-in.png",
  "/assets/proteins/chicken-wing-tip.png",
];

type Props = {
  perRow?: number;
  rows?: number;
  speed?: number;
};

export function HeroMarquee({ perRow = 6, rows = 2, speed = 55 }: Props) {
  const vary = (r: number, i: number) => {
    const seed = r * 7 + i * 13;
    const scale = 0.78 + ((seed * 11) % 45) / 100;
    const yShift = ((seed * 17) % 22) - 10;
    const rot = (((seed * 19) % 9) - 4) * 0.6;
    return { scale, yShift, rot };
  };

  return (
    <div className="hero-marquee" aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className={`hm-row${r % 2 ? " hm-row-rev" : ""}`}
          style={{ "--hm-speed": `${speed}s` } as React.CSSProperties}
        >
          <div className="hm-track">
            {[...Array(perRow * 2)].map((_, i) => {
              const srcIndex = (r * perRow + (i % perRow)) % PROTEIN_SRCS.length;
              const src = PROTEIN_SRCS[srcIndex];
              const { scale, yShift, rot } = vary(r, i);
              return (
                <div
                  key={i}
                  className="hm-card"
                  style={{
                    "--hm-scale": scale,
                    "--hm-y": `${yShift}px`,
                    "--hm-rot": `${rot}deg`,
                  } as React.CSSProperties}
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className="hm-img"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
