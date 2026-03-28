import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 14, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [8, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleScale = interpolate(titleSpring, [0, 1], [0.8, 1]);

  const subOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [30, 50], [25, 0], { extrapolateRight: "clamp" });

  const btnSpring = spring({ frame: frame - 45, fps, config: { damping: 12, stiffness: 120 } });
  const btnOpacity = interpolate(frame, [43, 55], [0, 1], { extrapolateRight: "clamp" });
  const btnScale = interpolate(btnSpring, [0, 1], [0.7, 1]);

  // Pulsing glow on button
  const pulseScale = 1 + 0.03 * Math.sin((frame - 55) * 0.15);

  // Phone number
  const phoneOpacity = interpolate(frame, [60, 75], [0, 1], { extrapolateRight: "clamp" });
  const phoneY = interpolate(frame, [60, 78], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Big radial glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsla(26, 100%, 55%, 0.15), transparent 70%)",
        }}
      />

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <h2
          style={{
            fontFamily: "sans-serif",
            fontSize: 70,
            fontWeight: 900,
            color: "white",
            lineHeight: 1.3,
          }}
        >
          صحتك تستحق الأفضل
        </h2>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          marginBottom: 40,
        }}
      >
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 30,
            color: "hsla(0, 0%, 100%, 0.7)",
            textAlign: "center",
          }}
        >
          احجز خدمتك الآن واحصل على رعاية طبية في منزلك
        </p>
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: btnOpacity,
          transform: `scale(${btnScale * pulseScale})`,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, hsl(26, 100%, 55%), hsl(40, 100%, 62%))",
            borderRadius: 60,
            padding: "22px 70px",
            boxShadow: "0 10px 50px hsla(26, 100%, 55%, 0.5)",
          }}
        >
          <span
            style={{
              fontFamily: "sans-serif",
              fontSize: 34,
              fontWeight: 800,
              color: "white",
            }}
          >
            احجز الآن 📅
          </span>
        </div>
      </div>

      {/* Phone */}
      <div
        style={{
          opacity: phoneOpacity,
          transform: `translateY(${phoneY}px)`,
        }}
      >
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            color: "hsl(26, 100%, 65%)",
            fontWeight: 600,
            direction: "ltr",
          }}
        >
          📞 +962 790 619 770
        </p>
      </div>

      {/* Brand watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          opacity: interpolate(frame, [70, 90], [0, 0.4], { extrapolateRight: "clamp" }),
        }}
      >
        <p style={{ fontFamily: "sans-serif", fontSize: 20, color: "white", fontWeight: 600 }}>
          أمة الحقل الطبي — MFN
        </p>
      </div>
    </AbsoluteFill>
  );
};
