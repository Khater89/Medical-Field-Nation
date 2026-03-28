import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Brand name animation
  const brandScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const brandOpacity = interpolate(frame, [8, 25], [0, 1], { extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [35, 55], [30, 0], { extrapolateRight: "clamp" });

  // Decorative line
  const lineWidth = interpolate(frame, [5, 40], [0, 300], { extrapolateRight: "clamp" });

  // Pulse ring
  const ringScale = interpolate(frame, [0, 80], [0.8, 1.3]);
  const ringOpacity = interpolate(frame, [0, 80], [0.4, 0]);

  // Medical cross
  const crossRotate = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 80 } });
  const crossScale = spring({ frame: frame - 5, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Pulse ring behind */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "2px solid hsl(26, 100%, 55%)",
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />

      {/* Medical cross icon */}
      <div
        style={{
          position: "absolute",
          top: 280,
          transform: `scale(${crossScale}) rotate(${interpolate(crossRotate, [0, 1], [-90, 0])}deg)`,
          opacity: interpolate(crossScale, [0, 1], [0, 1]),
        }}
      >
        <svg width="80" height="80" viewBox="0 0 80 80">
          <rect x="30" y="5" width="20" height="70" rx="4" fill="hsl(26, 100%, 55%)" />
          <rect x="5" y="30" width="70" height="20" rx="4" fill="hsl(26, 100%, 55%)" />
        </svg>
      </div>

      {/* Decorative line */}
      <div
        style={{
          position: "absolute",
          top: 375,
          width: lineWidth,
          height: 3,
          background: "linear-gradient(90deg, transparent, hsl(26, 100%, 55%), transparent)",
          borderRadius: 2,
        }}
      />

      {/* Brand name */}
      <div
        style={{
          transform: `scale(${brandScale})`,
          opacity: brandOpacity,
          marginTop: 20,
        }}
      >
        <h1
          style={{
            fontFamily: "sans-serif",
            fontSize: 90,
            fontWeight: 900,
            color: "white",
            textAlign: "center",
            lineHeight: 1.2,
            textShadow: "0 0 60px hsla(26, 100%, 55%, 0.3)",
          }}
        >
          أمة الحقل الطبي
        </h1>
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: 520,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}
      >
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 36,
            color: "hsl(26, 100%, 65%)",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          خدمات طبية منزلية موثوقة
        </p>
      </div>
    </AbsoluteFill>
  );
};
