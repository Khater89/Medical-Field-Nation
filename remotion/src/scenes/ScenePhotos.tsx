import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const cards = [
  {
    title: "تمريض منزلي",
    caption: "رعاية بلمسة إنسانية",
    color: "hsl(340, 82%, 60%)",
    icon: (
      <g>
        {/* Nurse illustration */}
        <circle cx="0" cy="-40" r="42" fill="#fce7d6" />
        <path d="M -42 -40 Q 0 -110 42 -40 L 42 -70 L -42 -70 Z" fill="#ffffff" />
        <rect x="-6" y="-78" width="12" height="18" fill="hsl(340, 82%, 60%)" />
        <rect x="-14" y="-72" width="28" height="6" fill="hsl(340, 82%, 60%)" />
        {/* Body */}
        <path d="M -70 90 Q -70 0 0 0 Q 70 0 70 90 Z" fill="#ffffff" />
        {/* Heart */}
        <path
          d="M -12 30 C -12 20 0 20 0 32 C 0 20 12 20 12 30 C 12 42 0 52 0 52 C 0 52 -12 42 -12 30 Z"
          fill="hsl(340, 82%, 60%)"
        />
      </g>
    ),
  },
  {
    title: "كشف طبي",
    caption: "أطباء معتمدون في منزلك",
    color: "hsl(210, 90%, 55%)",
    icon: (
      <g>
        <circle cx="0" cy="-40" r="42" fill="#fce7d6" />
        {/* Doctor hair */}
        <path d="M -42 -50 Q -30 -90 0 -85 Q 30 -90 42 -50 L 42 -30 L -42 -30 Z" fill="#3a3a3a" />
        {/* Coat */}
        <path d="M -70 90 Q -70 0 0 0 Q 70 0 70 90 Z" fill="#ffffff" />
        <path d="M 0 0 L 0 90" stroke="#dcdcdc" strokeWidth="2" />
        {/* Stethoscope */}
        <path d="M -20 10 Q -35 40 -20 70" stroke="hsl(210, 90%, 55%)" strokeWidth="5" fill="none" />
        <path d="M 20 10 Q 35 40 20 70" stroke="hsl(210, 90%, 55%)" strokeWidth="5" fill="none" />
        <circle cx="0" cy="80" r="12" fill="hsl(210, 90%, 55%)" />
      </g>
    ),
  },
  {
    title: "علاج طبيعي",
    caption: "تأهيل احترافي وآمن",
    color: "hsl(160, 70%, 45%)",
    icon: (
      <g>
        <circle cx="0" cy="-40" r="42" fill="#fce7d6" />
        <path d="M -42 -60 Q 0 -100 42 -60 L 42 -30 L -42 -30 Z" fill="#5a3a2a" />
        {/* Body */}
        <path d="M -70 90 Q -70 0 0 0 Q 70 0 70 90 Z" fill="hsl(160, 70%, 45%)" />
        {/* Dumbbell */}
        <rect x="-45" y="35" width="90" height="10" rx="3" fill="#2a2a2a" />
        <rect x="-55" y="25" width="14" height="30" rx="3" fill="#2a2a2a" />
        <rect x="41" y="25" width="14" height="30" rx="3" fill="#2a2a2a" />
      </g>
    ),
  },
];

export const ScenePhotos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [0, 22], [30, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
      <div
        style={{
          position: "absolute",
          top: 90,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: "sans-serif", fontSize: 56, fontWeight: 800, color: "white" }}>
          رعاية حقيقية. في منزلك.
        </h2>
        <div
          style={{
            width: interpolate(frame, [8, 30], [0, 180], { extrapolateRight: "clamp" }),
            height: 4,
            background: "hsl(26, 100%, 55%)",
            margin: "12px auto 0",
            borderRadius: 2,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 28,
          marginTop: 80,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cards.map((c, i) => {
          const delay = 18 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130 } });
          const opacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
          const tilt = (i - 1) * 3;
          const bob = Math.sin((frame - delay) * 0.05) * 6;

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${(1 - s) * 60 + bob}px) scale(${0.85 + s * 0.15}) rotate(${tilt}deg)`,
                width: 420,
                height: 540,
                borderRadius: 28,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 25px 80px hsla(0,0%,0%,0.55), 0 0 0 1px hsla(26,100%,55%,0.25)",
                background: `linear-gradient(160deg, ${c.color}, hsla(220,30%,15%,0.95))`,
              }}
            >
              {/* Backdrop circle */}
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 300,
                  height: 300,
                  borderRadius: "50%",
                  background: "hsla(0,0%,100%,0.12)",
                }}
              />
              {/* Illustrated character */}
              <svg
                viewBox="-100 -120 200 220"
                style={{
                  position: "absolute",
                  top: 90,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 280,
                  height: 300,
                }}
              >
                {c.icon}
              </svg>
              {/* Accent corner glow */}
              <div
                style={{
                  position: "absolute",
                  top: -80,
                  right: -80,
                  width: 220,
                  height: 220,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, hsla(26,100%,55%,0.6), transparent 70%)",
                  filter: "blur(10px)",
                }}
              />
              {/* Caption */}
              <div style={{ position: "absolute", bottom: 28, left: 24, right: 24, textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 999,
                    background: "hsla(26,100%,55%,0.95)",
                    color: "white",
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 10,
                    fontFamily: "sans-serif",
                  }}
                >
                  {c.title}
                </div>
                <div
                  style={{
                    fontFamily: "sans-serif",
                    color: "white",
                    fontSize: 24,
                    fontWeight: 700,
                    textShadow: "0 2px 12px rgba(0,0,0,0.7)",
                  }}
                >
                  {c.caption}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
