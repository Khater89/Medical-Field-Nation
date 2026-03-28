import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const stats = [
  { value: "22+", label: "خدمة طبية" },
  { value: "24/7", label: "متاح دائماً" },
  { value: "5+", label: "مدن" },
];

export const Scene4Stats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 100, alignItems: "center" }}>
        {stats.map((stat, i) => {
          const delay = 5 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const scale = interpolate(s, [0, 1], [0.5, 1]);

          // Counter animation
          const numericValue = parseInt(stat.value) || 0;
          const countProgress = interpolate(frame, [delay + 5, delay + 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const displayValue = stat.value === "24/7"
            ? "24/7"
            : Math.round(numericValue * countProgress) + "+";

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `scale(${scale})`,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 100,
                  fontWeight: 900,
                  background: "linear-gradient(135deg, hsl(26, 100%, 55%), hsl(40, 100%, 62%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                  marginBottom: 15,
                }}
              >
                {displayValue}
              </p>
              <p
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 28,
                  color: "hsla(0, 0%, 100%, 0.7)",
                  fontWeight: 600,
                }}
              >
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
