import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const steps = [
  { num: "01", title: "اختر الخدمة", desc: "تصفح خدماتنا واحجز ما تحتاجه" },
  { num: "02", title: "حدد الموعد", desc: "اختر الوقت والمكان المناسب لك" },
  { num: "03", title: "نصلك للمنزل", desc: "طاقم طبي مرخّص يزورك في بيتك" },
];

export const Scene3HowItWorks: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 25], [40, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 140,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: "sans-serif",
            fontSize: 58,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
          }}
        >
          كيف يعمل؟
        </h2>
      </div>

      {/* Steps */}
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "flex-start",
          marginTop: 80,
        }}
      >
        {steps.map((step, i) => {
          const delay = 15 + i * 18;
          const stepSpring = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
          const stepOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const stepY = interpolate(stepSpring, [0, 1], [50, 0]);

          // Connecting line between steps
          const lineProgress = i < 2 ? interpolate(frame, [delay + 15, delay + 30], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) : 0;

          return (
            <div key={i} style={{ position: "relative" }}>
              <div
                style={{
                  opacity: stepOpacity,
                  transform: `translateY(${stepY}px)`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 320,
                  textAlign: "center",
                }}
              >
                {/* Number circle */}
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, hsl(26, 100%, 55%), hsl(40, 100%, 62%))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    fontWeight: 900,
                    color: "white",
                    fontFamily: "sans-serif",
                    boxShadow: "0 8px 30px hsla(26, 100%, 55%, 0.4)",
                    marginBottom: 25,
                  }}
                >
                  {step.num}
                </div>

                <h3
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 30,
                    fontWeight: 700,
                    color: "white",
                    marginBottom: 10,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 22,
                    color: "hsla(0, 0%, 100%, 0.65)",
                    lineHeight: 1.5,
                  }}
                >
                  {step.desc}
                </p>
              </div>

              {/* Connecting line */}
              {i < 2 && (
                <div
                  style={{
                    position: "absolute",
                    top: 45,
                    left: 320,
                    width: 60 * lineProgress,
                    height: 3,
                    background: "hsl(26, 100%, 55%)",
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
