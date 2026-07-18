"use client";

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { GlowingEffect } from '@/components/ui/glowing-effect';

interface StepItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
}

interface ScrollExpansionHeroProps {
  backgroundSrc: string;
  brand: string;
  tagline: string;
  title: string;
  subtitle: string;
  actionHref: string;
  actionLabel: string;
  steps: StepItem[];
  children?: ReactNode;
}

const SWARM_GREEN = '#3DEB52';

const SWARM_POINTS = [
  { top: 15, left: 8, size: 36, speed: 4.0 },
  { top: 25, left: 14, size: 24, speed: 3.5 },
  { top: 35, left: 5, size: 28, speed: 4.8 },
  { top: 48, left: 10, size: 32, speed: 3.2 },
  { top: 62, left: 4, size: 26, speed: 4.2 },
  { top: 75, left: 12, size: 30, speed: 3.8 },
  { top: 18, left: 88, size: 32, speed: 4.5 },
  { top: 28, left: 82, size: 28, speed: 3.9 },
  { top: 42, left: 90, size: 36, speed: 4.1 },
  { top: 55, left: 84, size: 24, speed: 3.3 },
  { top: 68, left: 92, size: 30, speed: 4.7 },
  { top: 80, left: 86, size: 26, speed: 3.6 },
  { top: 8, left: 22, size: 20, speed: 3.0 },
  { top: 12, left: 38, size: 16, speed: 5.2 },
  { top: 10, left: 54, size: 18, speed: 4.6 },
  { top: 7, left: 70, size: 22, speed: 3.4 },
  { top: 15, left: 78, size: 20, speed: 4.0 },
  { top: 78, left: 24, size: 22, speed: 3.7 },
  { top: 85, left: 38, size: 18, speed: 4.9 },
  { top: 82, left: 52, size: 20, speed: 3.1 },
  { top: 88, left: 68, size: 24, speed: 4.3 },
  { top: 75, left: 76, size: 16, speed: 3.5 },
  { top: 22, left: 26, size: 14, speed: 4.1 },
  { top: 30, left: 44, size: 16, speed: 3.3 },
  { top: 28, left: 68, size: 14, speed: 4.7 },
  { top: 40, left: 20, size: 16, speed: 3.8 },
  { top: 45, left: 78, size: 14, speed: 5.0 },
  { top: 58, left: 22, size: 16, speed: 4.2 },
  { top: 62, left: 60, size: 14, speed: 3.6 },
  { top: 68, left: 40, size: 16, speed: 4.4 },
];

const EXTRA_SWARM_POINTS = Array.from({ length: 62 }, (_, index) => {
  const column = index % 13;
  const row = Math.floor(index / 13);
  const jitterX = ((index * 17) % 9) - 4;
  const jitterY = ((index * 23) % 11) - 5;

  return {
    top: 12 + row * 15 + jitterY,
    left: 8 + column * 7 + jitterX,
    size: 8 + ((index * 7) % 13),
    speed: 3.1 + ((index * 11) % 18) / 10,
  };
});

const ALL_SWARM_POINTS = [...SWARM_POINTS, ...EXTRA_SWARM_POINTS];

const FINAL_SCATTER_POINTS = ALL_SWARM_POINTS.map((_, index) => {
  const angle = index * 2.399963229728653;
  const ring = index % 4;
  const radius = 24 + ring * 7 + ((index * 5) % 7);
  const drift = ((index * 13) % 9) - 4;

  return {
    top: 50 + Math.sin(angle) * radius * 0.58 + drift * 0.25,
    left: 50 + Math.cos(angle) * radius + drift * 0.35,
  };
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}

function useLockedHeroProgress() {
  const [progress, setProgress] = useState(0);
  const [released, setReleased] = useState(false);
  const progressRef = useRef(0);
  const releasedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    let autoPlayInterval: number | undefined;

    const setProgressValue = (value: number) => {
      const next = clamp(value, 0, 1);
      progressRef.current = next;
      setProgress(next);

      if (next >= 1) {
        releasedRef.current = true;
        setReleased(true);
      } else {
        releasedRef.current = false;
        setReleased(false);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      userInteractedRef.current = true;
      const atHeroTop = window.scrollY <= 2;
      const scrollingDown = event.deltaY > 0;
      const scrollingUp = event.deltaY < 0;

      if (atHeroTop && scrollingDown && !releasedRef.current) {
        event.preventDefault();
        setProgressValue(progressRef.current + event.deltaY * 0.0008);
        return;
      }

      if (atHeroTop && scrollingUp && progressRef.current > 0) {
        event.preventDefault();
        setProgressValue(progressRef.current + event.deltaY * 0.0012);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      userInteractedRef.current = true;
      touchStartY.current = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchStartY.current) return;

      const currentY = event.touches[0]?.clientY ?? touchStartY.current;
      const deltaY = touchStartY.current - currentY;
      const atHeroTop = window.scrollY <= 2;
      const swipingDownPage = deltaY > 0;
      const swipingUpPage = deltaY < 0;

      if (atHeroTop && swipingDownPage && !releasedRef.current) {
        event.preventDefault();
        setProgressValue(progressRef.current + deltaY * 0.0035);
        touchStartY.current = currentY;
        return;
      }

      if (atHeroTop && swipingUpPage && progressRef.current > 0) {
        event.preventDefault();
        setProgressValue(progressRef.current + deltaY * 0.0045);
        touchStartY.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      touchStartY.current = 0;
    };

    const autoPlayTimer = window.setTimeout(() => {
      if (userInteractedRef.current || releasedRef.current) return;

      autoPlayInterval = window.setInterval(() => {
        if (userInteractedRef.current || releasedRef.current) {
          if (autoPlayInterval) window.clearInterval(autoPlayInterval);
          return;
        }

        setProgressValue(progressRef.current + 0.012);
      }, 48);
    }, 5000);

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.clearTimeout(autoPlayTimer);
      if (autoPlayInterval) window.clearInterval(autoPlayInterval);
    };
  }, []);

  return { progress, released };
}

function MacDock({ steps, mouseX }: { steps: StepItem[]; mouseX: MotionValue<number> }) {
  return (
    <div className="mx-auto flex h-20 items-end justify-center gap-4 rounded-3xl border border-[#173127]/10 bg-white/55 px-6 pb-3 shadow-[0_18px_55px_rgba(23,49,39,0.08)] backdrop-blur-xl">
      {steps.map((step) => (
        <DockItem
          key={step.href}
          mouseX={mouseX}
          href={step.href}
          icon={step.icon}
          label={step.label}
        />
      ))}
    </div>
  );
}

function DockItem({
  mouseX,
  href,
  icon: Icon,
  label,
}: {
  mouseX: MotionValue<number>;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeTransform = useTransform(distance, [-150, 0, 150], [54, 76, 54]);
  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 180,
    damping: 15,
  });

  return (
    <Link
      href={href}
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center justify-center"
    >
      <motion.div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full border border-[#173127]/10 bg-white/75 text-[#173127] shadow-[0_10px_28px_rgba(23,49,39,0.09)] transition-colors hover:border-[#3DEB52] hover:bg-white hover:text-[#132820]"
      >
        <Icon className="h-[45%] w-[45%]" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={hovered ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="pointer-events-none absolute -top-12 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#132820] px-3 py-1 text-xs font-semibold text-white shadow-xl"
      >
        {label}
      </motion.div>
    </Link>
  );
}

function SwarmNode({
  point,
  progress,
  index,
}: {
  point: (typeof ALL_SWARM_POINTS)[number];
  progress: number;
  index: number;
}) {
  const target = FINAL_SCATTER_POINTS[index % FINAL_SCATTER_POINTS.length];
  const morph = easeOutCubic((progress - 0.18) / 0.64);
  const finalGlow = easeOutCubic((progress - 0.54) / 0.3);
  const delay = (index * 0.08).toFixed(2);
  const size = mix(point.size, 8 + ((index * 3) % 10), morph);
  const glowSize = mix(18, 28, finalGlow);

  return (
    <div
      className="absolute pointer-events-none select-none rounded-full transition-[top,left,width,height,background-color,border-color,box-shadow] duration-700 ease-out"
      style={{
        top: `${mix(point.top, target.top, morph)}%`,
        left: `${mix(point.left, target.left, morph)}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        animation: `float-${index % 4} ${point.speed}s ease-in-out infinite alternate`,
        animationDelay: `${delay}s`,
        opacity: mix(0.78, 1, finalGlow),
        background: SWARM_GREEN,
        border: '1px solid rgba(61,235,82,0.42)',
        boxShadow: `0 0 ${glowSize}px rgba(61,235,82,0.26)`,
      }}
    />
  );
}

function MouseGlowButton({ href, label }: { href: string; label: string }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });

  return (
    <Link
      href={href}
      onPointerMove={(event) => {
        const rect = (event.currentTarget as HTMLAnchorElement).getBoundingClientRect();
        setPos({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
      className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[#2D4A3E]/15 bg-[#173127] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(14,28,23,0.12)] transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        backgroundImage: `radial-gradient(circle at ${pos.x}% ${pos.y}%, rgba(61,235,82,0.35), rgba(23,49,39,0.95) 56%)`,
      }}
    >
      <GlowingEffect
        disabled={false}
        glow
        blur={1}
        spread={34}
        borderWidth={2}
        proximity={80}
        inactiveZone={0.05}
        className="rounded-full"
      />
      <span className="relative z-10 inline-flex items-center gap-2 rounded-full px-0.5">
        {label}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function ScrollExpansionHero({
  brand,
  tagline,
  title,
  subtitle,
  actionHref,
  actionLabel,
  steps,
  children,
}: ScrollExpansionHeroProps) {
  const { progress, released } = useLockedHeroProgress();
  const introOpacity = easeOutCubic((progress - 0.03) / 0.34);
  const dockOpacity = easeOutCubic((progress - 0.48) / 0.24);
  const heroCopyOpacity = introOpacity;
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="bg-[#FBFBFA] text-[#173127]">
      <style>{`
        @keyframes float-0 {
          0% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) translateY(6px) rotate(1deg); }
        }
        @keyframes float-1 {
          0% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) translateY(-6px) rotate(-1deg); }
        }
        @keyframes float-2 {
          0% { transform: translate(-50%, -50%) translateX(0px) scale(1); }
          100% { transform: translate(-50%, -50%) translateX(5px) scale(1.04); }
        }
        @keyframes float-3 {
          0% { transform: translate(-50%, -50%) translate(0px, 0px); }
          100% { transform: translate(-50%, -50%) translate(-5px, 4px); }
        }
      `}</style>

      <section className="relative min-h-screen overflow-hidden">
        <div className="h-screen overflow-hidden">
          <div className="absolute inset-0 overflow-hidden bg-[#FBFBFA]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_90%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(61,235,82,0.10)_0%,transparent_70%)]" />

            <div className="absolute inset-0 pointer-events-none select-none">
              {ALL_SWARM_POINTS.map((point, index) => (
                <SwarmNode key={index} point={point} progress={progress} index={index} />
              ))}
            </div>

            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <header className="flex items-center justify-between px-6 pt-5 sm:px-8 lg:px-12">
              <div className="space-y-0.5">
                <div className="text-2xl font-semibold tracking-tight text-[#173127]">
                  {brand}
                </div>
                <p className="text-xs text-[#173127]/60 sm:text-sm">{tagline}</p>
              </div>

              <div className="hidden h-12 w-12 rounded-full border border-[#2D4A3E]/10 bg-[#2D4A3E]/5 shadow-[0_8px_24px_rgba(10,18,15,0.04)] sm:block" />
            </header>

            <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
              <div
                className="mx-auto flex max-w-4xl flex-col items-center text-center transition-all duration-200"
                style={{
                  opacity: heroCopyOpacity,
                  transform: `translateY(${(1 - introOpacity) * 24}px)`,
                }}
              >
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2D4A3E]/15 bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.26em] text-[#173127]/80 backdrop-blur-md">
                  AI copilot for JAKIM halal certification
                </p>
                <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-[#173127] sm:text-5xl lg:text-7xl">
                  {title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-[#173127]/75 sm:text-lg lg:text-xl">
                  {subtitle}
                </p>

                <div className="mt-9">
                  <MouseGlowButton href={actionHref} label={actionLabel} />
                </div>
              </div>
            </div>

            <div
              className="flex justify-center px-4 pb-6 sm:px-6 lg:px-10"
              style={{
                opacity: dockOpacity,
                transform: `translateY(${(1 - dockOpacity) * 16}px)`,
                pointerEvents: released ? 'auto' : 'none',
              }}
              onMouseMove={(e) => mouseX.set(e.clientX)}
              onMouseLeave={() => mouseX.set(Infinity)}
            >
              <MacDock steps={steps} mouseX={mouseX} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-white px-4 pb-20 pt-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </section>
    </div>
  );
}
