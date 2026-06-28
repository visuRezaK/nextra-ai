"use client";

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

// The rotating ring of images. Extracted so it can be reused outside the full
// hero (e.g. in place of a static image on another screen).
export function ImageRing({ images }: { images: ImageCard[] }) {
  // Static ring layout, computed once. The whole ring is rotated as a single
  // GPU-composited layer via CSS (see `.hero-ring` in globals.css) — nothing is
  // re-rastered per frame, which is what keeps it smooth on mobile.
  const radius = 180;
  const ringCards = images.map((image, index) => {
    const angle = index * (360 / images.length) * (Math.PI / 180);
    return {
      ...image,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  return (
    <div className="relative mb-12 h-96 w-full max-w-6xl sm:mb-16 sm:h-[500px]">
      <div className="hero-ring absolute inset-0 flex items-center justify-center">
        {ringCards.map((image) => (
          <div
            key={image.id}
            className="absolute h-40 w-32 sm:h-48 sm:w-40"
            style={{
              transform: `translate(${image.x}px, ${image.y}px) rotate(${image.rotation}deg)`,
            }}
          >
            <div className="group relative h-full w-full overflow-hidden rounded-2xl shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={image.alt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImageCarouselHero({
  title,
  description,
  ctaText,
  onCtaClick,
  features = [],
}: ImageCarouselHeroProps) {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background">
      {/* Animated background glow — desktop only; animated blur jitters on iOS Safari */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
        <div className="absolute right-0 top-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 animate-pulse rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
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
                className="group rounded-xl border border-border/50 bg-surface-2/80 p-6 text-center transition-all duration-300 hover:border-border hover:bg-surface-2 md:bg-surface-2/50 md:backdrop-blur-sm md:hover:bg-surface-2/80"
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
