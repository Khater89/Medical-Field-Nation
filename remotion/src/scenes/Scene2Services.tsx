import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";

const services = [
  { name: "طب عام", icon: "🩺" },
  { name: "تمريض منزلي", icon: "💉" },
  { name: "حقن وريدي", icon: "💧" },
  { name: "علامات حيوية", icon: "📊" },
  { name: "علاج كسور", icon: "🦴" },
  { name: "نقل مرضى", icon: "🚑" },
];

export const Scene2Services: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 80 }}>
      {/* Section title */}
      <div
        style={{
          position: "absolute",
          top: 120,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: "sans-serif",
            fontSize: 60,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
          }}
        >
          خدماتنا الطبية
        </h2>
        <div
          style={{
            width: interpolate(frame, [10, 35], [0, 200], { extrapolateRight: "clamp" }),
            height: 4,
            background: "hsl(26, 100%, 55%)",
            margin: "15px auto 0",
            borderRadius: 2,
          }}
        />
      </div>

      {/* Service cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 30,
          marginTop: 100,
          width: "100%",
          maxWidth: 1400,
        }}
      >
        {services.map((service, i) => {
          const delay = 20 + i * 8;
          const cardScale = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 150 } });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div
              key={i}
              style={{
                transform: `scale(${cardScale})`,
                opacity: cardOpacity,
                background: "linear-gradient(135deg, hsla(220, 20%, 20%, 0.8), hsla(220, 20%, 15%, 0.9))",
                borderRadius: 20,
                padding: "40px 30px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 15,
                border: "1px solid hsla(26, 100%, 55%, 0.2)",
                boxShadow: "0 10px 40px hsla(0, 0%, 0%, 0.3)",
              }}
            >
              <span style={{ fontSize: 56 }}>{service.icon}</span>
              <span
                style={{
                  fontFamily: "sans-serif",
                  fontSize: 26,
                  fontWeight: 700,
                  color: "white",
                  textAlign: "center",
                }}
              >
                {service.name}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
