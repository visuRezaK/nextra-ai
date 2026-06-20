"use client";

import { Particles, ParticlesProvider, useParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const options: ISourceOptions = {
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  particles: {
    color: { value: ["#0EA5E9", "#38BDF8", "#7DD3FC", "#ffffff"] },
    links: {
      color: "#38BDF8",
      distance: 150,
      enable: true,
      opacity: 0.18,
      width: 1,
    },
    move: {
      enable: true,
      speed: 1,
      direction: "none",
      random: true,
      outModes: { default: "out" },
    },
    number: {
      density: { enable: true },
      value: 70,
    },
    opacity: {
      value: { min: 0.2, max: 0.7 },
    },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 3 } },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: "grab" },
    },
    modes: {
      grab: { distance: 140, links: { opacity: 0.45 } },
    },
  },
  detectRetina: true,
};

function Inner() {
  const { loaded } = useParticlesProvider();
  if (!loaded) return null;
  return (
    <Particles
      id="hero-particles"
      className="absolute inset-0 h-full w-full"
      options={options}
    />
  );
}

export function ParticleBg() {
  return (
    <ParticlesProvider init={loadSlim}>
      <Inner />
    </ParticlesProvider>
  );
}
