import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Scene1Intro } from "./scenes/Scene1Intro";
import { Scene2Services } from "./scenes/Scene2Services";
import { Scene3HowItWorks } from "./scenes/Scene3HowItWorks";
import { Scene4Stats } from "./scenes/Scene4Stats";
import { Scene5CTA } from "./scenes/Scene5CTA";

const TRANSITION_DURATION = 20;

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Persistent animated background
  const bgHue = interpolate(frame, [0, 450], [210, 230]);
  const bgGradientAngle = interpolate(frame, [0, 450], [135, 180]);

  return (
    <AbsoluteFill>
      {/* Animated background gradient */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(${bgGradientAngle}deg, hsl(${bgHue}, 30%, 12%), hsl(220, 25%, 8%))`,
        }}
      />

      {/* Floating accent orbs */}
      <FloatingOrbs frame={frame} />

      {/* Scenes with transitions */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={100}>
          <Scene1Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={110}>
          <Scene2Services />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={100}>
          <Scene3HowItWorks />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={90}>
          <Scene4Stats />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

const FloatingOrbs: React.FC<{ frame: number }> = ({ frame }) => {
  const orb1Y = interpolate(frame, [0, 450], [0, -60]);
  const orb2X = interpolate(frame, [0, 450], [0, 40]);
  const orb1Opacity = 0.15 + 0.05 * Math.sin(frame * 0.03);
  const orb2Opacity = 0.1 + 0.05 * Math.sin(frame * 0.04 + 1);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 100 + orb1Y,
          right: 200,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(26, 100%, 55%), transparent 70%)",
          opacity: orb1Opacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 100 + orb2X,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(40, 100%, 62%), transparent 70%)",
          opacity: orb2Opacity,
        }}
      />
    </>
  );
};
