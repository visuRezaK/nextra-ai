"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  // Seed each card evenly around the circle (lazy initializer — no setState-in-effect)
  const [rotatingCards, setRotatingCards] = useState<number[]>(() =>
    images.map((_, i) => i * (360 / images.length)),
  );

  // Continuous rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingCards((prev) => prev.map((v) => (v + 0.5) % 360));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
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
          onMouseLeave={() => setMousePosition({ x: 0.5, y: 0.5 })}
        >
          <div className="perspective absolute inset-0 flex items-center justify-center">
            {images.map((image, index) => {
              const angle = (rotatingCards[index] || 0) * (Math.PI / 180);
              const radius = 180;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const perspectiveX = (mousePosition.x - 0.5) * 20;
              const perspectiveY = (mousePosition.y - 0.5) * 20;

              return (
                <div
                  key={image.id}
                  className="absolute h-40 w-32 transition-all duration-300 sm:h-48 sm:w-40"
                  style={{
                    transform: `translate(${x}px, ${y}px) rotateX(${perspectiveY}deg) rotateY(${perspectiveX}deg) rotateZ(${image.rotation}deg)`,
                    transformStyle: "preserve-3d",
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
