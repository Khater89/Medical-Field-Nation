import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

const photos = [
  { src: "images/scene-nurse.jpg", title: "تمريض منزلي", caption: "رعاية بلمسة إنسانية" },
  { src: "images/scene-doctor.jpg", title: "كشف طبي", caption: "أطباء معتمدون في منزلك" },
  { src: "images/scene-therapy.jpg", title: "علاج طبيعي", caption: "تأهيل احترافي وآمن" },
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
        {photos.map((p, i) => {
          const delay = 18 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130 } });
          const opacity = interpolate(frame, [delay, delay + 18], [0, 1], { extrapolateRight: "clamp" });
          // Ken Burns
          const kb = interpolate(frame - delay, [0, 110], [1.05, 1.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const drift = interpolate(frame - delay, [0, 110], [-10, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const tilt = (i - 1) * 3;

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + s * 0.15}) rotate(${tilt}deg)`,
                width: 420,
                height: 540,
                borderRadius: 28,
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 25px 80px hsla(0,0%,0%,0.55), 0 0 0 1px hsla(26,100%,55%,0.25)",
                background: "#000",
              }}
            >
              <Img
                src={staticFile(p.src)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${kb}) translateX(${drift}px)`,
                }}
              />
              {/* Gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, hsla(220,30%,5%,0.92) 0%, hsla(220,30%,5%,0.3) 45%, transparent 70%)",
                }}
              />
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
                  {p.title}
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
                  {p.caption}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
