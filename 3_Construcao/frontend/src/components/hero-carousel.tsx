"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";

// All ISPTEC campus images for the hero carousel
const HERO_IMAGES = [
  "/index/hero-bg-01.jpeg",
  "/index/hero-bg-02.jpeg",
  "/index/isptec-campus-01.jpeg",
  "/index/isptec-campus-02.jpeg",
  "/index/isptec-campus-03.jpeg",
  "/index/isptec-campus-04.jpeg",
  "/index/isptec-campus-05.jpeg",
  "/index/isptec-campus-06.jpeg",
  "/index/isptec-campus-07.jpeg",
  "/index/isptec-campus-08.jpeg",
  "/index/isptec-campus-09.jpeg",
  "/index/isptec-campus-10.jpeg",
  "/index/isptec-campus-11.jpeg",
  "/index/isptec-campus-12.jpeg",
  "/index/isptec-campus-13.jpeg",
  "/index/isptec-campus-14.jpeg",
  "/index/isptec-campus-15.jpeg",
  "/index/isptec-campus-16.jpeg",
  "/index/isptec-campus-17.jpeg",
  "/index/isptec-campus-18.jpeg",
  "/index/isptec-campus-19.jpeg",
  "/index/isptec-campus-20.jpeg",
  "/index/isptec-campus-21.jpeg",
  "/index/isptec-campus-22.jpeg",
  "/index/isptec-campus-23.jpeg",
  "/index/isptec-campus-24.jpeg",
  "/index/isptec-campus-25.jpeg",
  "/index/isptec-campus-26.jpeg",
  "/index/isptec-campus-27.jpeg",
  "/index/isptec-campus-28.jpeg",
  "/index/isptec-campus-29.jpeg",
  "/index/isptec-campus-30.jpeg",
  "/index/isptec-campus-31.jpeg",
  "/index/isptec-campus-32.jpeg",
  "/index/isptec-campus-33.jpeg",
];

const TRANSITION_DURATION = 1500; // 1.5s crossfade
const DISPLAY_DURATION = 6000; // 6s per image

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLayer, setShowLayer] = useState<"a" | "b">("a");
  const [layerA, setLayerA] = useState(0);
  const [layerB, setLayerB] = useState(1);
  const transitioning = useRef(false);

  const advanceSlide = useCallback(() => {
    if (transitioning.current) return;
    transitioning.current = true;

    const nextIdx = (showLayer === "a" ? layerA : layerB) + 1;
    const nextImageIndex = nextIdx % HERO_IMAGES.length;

    // Preload next image on the hidden layer, then crossfade
    if (showLayer === "a") {
      setLayerB(nextImageIndex);
      // Small delay to allow image to start loading before transition
      requestAnimationFrame(() => {
        setShowLayer("b");
        setActiveIndex(nextImageIndex);
      });
    } else {
      setLayerA(nextImageIndex);
      requestAnimationFrame(() => {
        setShowLayer("a");
        setActiveIndex(nextImageIndex);
      });
    }

    setTimeout(() => {
      transitioning.current = false;
    }, TRANSITION_DURATION + 100);
  }, [showLayer, layerA, layerB]);

  useEffect(() => {
    const interval = setInterval(advanceSlide, DISPLAY_DURATION);
    return () => clearInterval(interval);
  }, [advanceSlide]);

  return (
    <div className="absolute inset-0">
      {/* Layer A */}
      <Image
        src={HERO_IMAGES[layerA]}
        alt="ISPTEC Campus"
        fill
        className="object-cover"
        style={{
          opacity: showLayer === "a" ? 1 : 0,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
          zIndex: showLayer === "a" ? 1 : 0,
        }}
        priority={layerA === 0}
        quality={85}
        sizes="100vw"
      />

      {/* Layer B */}
      <Image
        src={HERO_IMAGES[layerB]}
        alt="ISPTEC Campus"
        fill
        className="object-cover"
        style={{
          opacity: showLayer === "b" ? 1 : 0,
          transition: `opacity ${TRANSITION_DURATION}ms ease-in-out`,
          zIndex: showLayer === "b" ? 1 : 0,
        }}
        quality={85}
        sizes="100vw"
      />

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"
        style={{ zIndex: 2 }}
      />
      <div
        className="absolute inset-0 bg-linear-to-t from-amber-900/70 via-transparent to-transparent"
        style={{ zIndex: 2 }}
      />

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {HERO_IMAGES.slice(0, 8).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-700 ${
              i === activeIndex % 8 ? "w-6 bg-amber-400" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
