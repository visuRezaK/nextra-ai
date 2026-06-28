"use client";

import type React from "react";
import { useRef, useEffect } from "react";
import { IconArrow } from "@/components/icons";

// Adapted from a 21st.dev shadcn component to this project's design tokens:
//   primary -> accent, card -> surface-2, muted-foreground -> muted, ring -> accent.
// Uses the existing IconArrow (no lucide-react) and plain <img> (no next.config change).

interface ImageCard {
  id: string;
  src: string;
  alt: string;
  rotation: number;
}

interface ImageCarouselHeroProps {
  title: string;
  subtitle?: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  images: ImageCard[];
  features?: Array<{ title: string; description: string }>;
}

export function ImageCarouselHero({
  title,
  description,
  ctaText,
  onCtaClick,
  images,
  features = [],
}: ImageCarouselHeroProps) {
  // Mouse perspective and orbit state live in refs so the rAF loop can read the
  // latest values without triggering React re-renders on every frame / mouse move.
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const count = images.length;

  // Continuous rotation animation — time-based requestAnimationFrame loop that
  // writes transforms straight to the DOM (no per-frame setState → no jitter).
  useEffect(() => {
    const radius = 180;
    const speed = 10; // degrees per second (matches the old 0.5deg / 50ms)
    const rotations = images.map((img) => img.rotation);

    const writeFrame = (baseAngle: number) => {
      const { x: mx, y: my } = mouseRef.current;
      const perspectiveX = (mx - 0.5) * 20;
      const perspectiveY = (my - 0.5) * 20;
      for (let i = 0; i < count; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const angle = ((baseAngle + i * (360 / count)) % 360) * (Math.PI / 180);
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        el.style.transform = `translate(${tx}px, ${ty}px) rotateX(${perspectiveY}deg) rotateY(${perspectiveX}deg) rotateZ(${rotations[i]}deg)`;
      }
    };

    // Respect reduced-motion: place cards once and skip the animation loop.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      writeFrame(0);
      return;
    }

    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const baseAngle = ((now - start) / 1000) * speed;
      writeFrame(baseAngle);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [images, count]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background">
      {/* Animated background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Carousel */}
        <div
          className="relative mb-12 h-96 w-full max-w-6xl sm:mb-16 sm:h-[500px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            mouseRef.current = { x: 0.5, y: 0.5 };
          }}
        >
          <div className="perspective absolute inset-0 flex items-center justify-center">
            {images.map((image, index) => {
              // Seed the first paint at baseAngle 0 (matches the rAF loop's start)
              // so the ring is already spread out before the animation takes over.
              const seedAngle = index * (360 / images.length) * (Math.PI / 180);
              const seedX = Math.cos(seedAngle) * 180;
              const seedY = Math.sin(seedAngle) * 180;
              return (
                <div
                  key={image.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className="absolute h-40 w-32 sm:h-48 sm:w-40"
                  style={{
                    transform: `translate(${seedX}px, ${seedY}px) rotateZ(${image.rotation}deg)`,
                    transformStyle: "preserve-3d",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="group relative h-full w-full cursor-pointer overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-20 mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <h1 className="mb-4 text-balance text-4xl font-bold leading-tight text-foreground sm:mb-6 sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="text-balance text-lg text-muted sm:text-xl">{description}</p>

          {ctaText && (
            <button
              onClick={onCtaClick}
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-accent-foreground transition-all duration-300 hover:scale-105 hover:bg-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 active:scale-95"
            >
              {ctaText}
              <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            </button>
          )}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div className="relative z-20 mt-12 grid w-full max-w-4xl grid-cols-1 gap-6 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-xl border border-border/50 bg-surface-2/50 p-6 text-center backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-surface-2/80"
              >
                <h3 className="mb-2 text-lg font-semibold text-foreground transition-colors group-hover:text-accent sm:text-xl">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted sm:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
