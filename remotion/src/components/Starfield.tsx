import { useMemo } from "react";

type Star = {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hue: number;
};

const seededRandom = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

export const Starfield: React.FC<{
  frame: number;
  count?: number;
  seed?: number;
  width?: number;
  height?: number;
}> = ({ frame, count = 140, seed = 42, width = 1920, height = 1080 }) => {
  const stars = useMemo<Star[]>(() => {
    const rand = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: rand() * width,
      y: rand() * height,
      size: 1 + rand() * 3.5,
      baseOpacity: 0.3 + rand() * 0.7,
      twinkleSpeed: 0.04 + rand() * 0.12,
      twinklePhase: rand() * Math.PI * 2,
      hue: rand() > 0.7 ? 40 : rand() > 0.4 ? 200 : 0,
    }));
  }, [count, seed, width, height]);

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="starGlow">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="40%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      {stars.map((star, i) => {
        const twinkle =
          0.5 +
          0.5 * Math.sin(frame * star.twinkleSpeed + star.twinklePhase);
        const opacity = star.baseOpacity * twinkle;
        const glowSize = star.size * (3 + twinkle * 4);
        const color =
          star.hue === 40
            ? "hsl(40,100%,70%)"
            : star.hue === 200
              ? "hsl(200,100%,75%)"
              : "white";
        return (
          <g key={i} opacity={opacity}>
            <circle
              cx={star.x}
              cy={star.y}
              r={glowSize}
              fill="url(#starGlow)"
              opacity={0.5}
            />
            <circle cx={star.x} cy={star.y} r={star.size} fill={color} />
            {star.size > 2.5 && (
              <>
                <line
                  x1={star.x - glowSize}
                  y1={star.y}
                  x2={star.x + glowSize}
                  y2={star.y}
                  stroke={color}
                  strokeWidth={0.6}
                  opacity={0.7}
                />
                <line
                  x1={star.x}
                  y1={star.y - glowSize}
                  x2={star.x}
                  y2={star.y + glowSize}
                  stroke={color}
                  strokeWidth={0.6}
                  opacity={0.7}
                />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const ShootingStars: React.FC<{ frame: number }> = ({ frame }) => {
  const shootings = [
    { start: 40, x: 200, y: 150, angle: 25 },
    { start: 180, x: 1400, y: 100, angle: 30 },
    { start: 320, x: 600, y: 80, angle: 20 },
    { start: 460, x: 1100, y: 200, angle: 35 },
  ];

  return (
    <>
      {shootings.map((s, i) => {
        const localFrame = frame - s.start;
        if (localFrame < 0 || localFrame > 40) return null;
        const progress = localFrame / 40;
        const distance = progress * 600;
        const rad = (s.angle * Math.PI) / 180;
        const x = s.x + Math.cos(rad) * distance;
        const y = s.y + Math.sin(rad) * distance;
        const opacity =
          progress < 0.2
            ? progress / 0.2
            : progress > 0.7
              ? (1 - progress) / 0.3
              : 1;
        const tailLength = 120;
        const tx = x - Math.cos(rad) * tailLength;
        const ty = y - Math.sin(rad) * tailLength;
        return (
          <svg
            key={i}
            width={1920}
            height={1080}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            <defs>
              <linearGradient
                id={`shoot${i}`}
                x1={tx}
                y1={ty}
                x2={x}
                y2={y}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(40,100%,75%)" stopOpacity="1" />
              </linearGradient>
            </defs>
            <line
              x1={tx}
              y1={ty}
              x2={x}
              y2={y}
              stroke={`url(#shoot${i})`}
              strokeWidth={3}
              opacity={opacity}
            />
            <circle cx={x} cy={y} r={5} fill="white" opacity={opacity} />
            <circle
              cx={x}
              cy={y}
              r={14}
              fill="white"
              opacity={opacity * 0.3}
            />
          </svg>
        );
      })}
    </>
  );
};
