import type { ReactNode } from "react";

import { FloatingOrb } from "@/features/auth/components/floating-orb";
import { JOSVN_LOGIN_GRADIENT } from "@/features/auth/brand/josvn-brand";

type LoginAiBackgroundProps = {
  children: ReactNode;
};

/**
 * Full-viewport AI-style backdrop: drifting mesh blobs, aurora, neural grid.
 */
export function LoginAiBackground({ children }: LoginAiBackgroundProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: JOSVN_LOGIN_GRADIENT }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <FloatingOrb
          className="-left-[20%] -top-[15%] h-[min(78vh,580px)] w-[min(78vh,580px)] opacity-90 blur-[120px]"
          gradient="radial-gradient(circle, rgba(99, 102, 241, 0.7) 0%, rgba(79, 70, 229, 0.25) 42%, transparent 68%)"
          rangeX={72}
          rangeY={64}
          intervalMin={1800}
          intervalMax={4500}
        />
        <FloatingOrb
          className="-right-[12%] top-[4%] h-[min(62vh,480px)] w-[min(62vh,480px)] opacity-85 blur-[110px]"
          gradient="radial-gradient(circle, rgba(6, 182, 212, 0.65) 0%, rgba(34, 211, 238, 0.2) 45%, transparent 70%)"
          rangeX={64}
          rangeY={52}
          intervalMin={2400}
          intervalMax={5600}
          durationMin={6}
          durationMax={13}
        />
        <FloatingOrb
          className="bottom-[-12%] left-[22%] h-[min(54vh,440px)] w-[min(72vw,560px)] opacity-80 blur-[130px]"
          gradient="radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, rgba(139, 92, 246, 0.25) 40%, transparent 72%)"
          rangeX={80}
          rangeY={56}
          intervalMin={2000}
          intervalMax={5000}
        />
        <FloatingOrb
          className="right-[18%] top-[42%] h-[min(38vh,320px)] w-[min(38vh,320px)] opacity-70 blur-[100px]"
          gradient="radial-gradient(circle, rgba(236, 72, 153, 0.45) 0%, transparent 68%)"
          rangeX={48}
          rangeY={44}
          intervalMin={2600}
          intervalMax={6000}
          durationMin={4}
          durationMax={9}
        />
        <FloatingOrb
          className="left-[38%] top-[32%] h-[min(32vh,280px)] w-[min(32vh,280px)] opacity-60 blur-[90px]"
          gradient="radial-gradient(circle, rgba(29, 185, 195, 0.5) 0%, transparent 65%)"
          rangeX={40}
          rangeY={36}
          intervalMin={3000}
          intervalMax={6500}
          durationMin={5}
          durationMax={12}
        />

        <div
          className="absolute left-[-10%] top-[38%] h-[28vh] w-[120%] opacity-70 blur-[60px] animate-login-aurora"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(6, 182, 212, 0.35) 25%, rgba(99, 102, 241, 0.4) 50%, rgba(168, 85, 247, 0.35) 75%, transparent 100%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.35] animate-login-grid-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(56, 189, 248, 0.45) 1px, transparent 1px),
              linear-gradient(90deg, rgba(129, 140, 248, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 92% 80% at 50% 42%, black 10%, transparent 78%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(165, 180, 252, 0.55) 1px, transparent 1px)`,
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 88% 72% at 50% 48%, black 5%, transparent 75%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                118deg,
                transparent 0px,
                transparent 80px,
                rgba(99, 102, 241, 0.06) 80px,
                rgba(6, 182, 212, 0.08) 81px,
                transparent 82px,
                transparent 160px
              )
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background:
              "conic-gradient(from 210deg at 55% 40%, transparent 0deg, rgba(99, 102, 241, 0.12) 60deg, transparent 120deg, rgba(6, 182, 212, 0.1) 200deg, transparent 280deg)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.07) 50%, transparent 68%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 35%, rgba(2, 3, 8, 0.55) 100%)",
          }}
        />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
