"use client";

import React, { useState, useEffect, useCallback } from "react";
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

const TRANSITION_INTERVAL = 6000; // 6 seconds per image

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const advanceSlide = useCallback(() => {
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      setNextIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      setIsTransitioning(false);
    }, 1000); // match the CSS transition duration
  }, []);

  useEffect(() => {
    const interval = setInterval(advanceSlide, TRANSITION_INTERVAL);
    return () => clearInterval(interval);
  }, [advanceSlide]);

  return (
    <div className="absolute inset-0">
      {/* Current image */}
      <Image
        src={HERO_IMAGES[currentIndex]}
        alt="ISPTEC Campus"
        fill
        className="object-cover transition-opacity duration-1000 ease-in-out"
        style={{ opacity: isTransitioning ? 0 : 1 }}
        priority={currentIndex === 0}
        quality={85}
        sizes="100vw"
      />

      {/* Next image (preloaded underneath) */}
      <Image
        src={HERO_IMAGES[nextIndex]}
        alt="ISPTEC Campus"
        fill
        className="object-cover"
        quality={85}
        sizes="100vw"
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
      <div className="absolute inset-0 bg-linear-to-t from-amber-900/70 via-transparent to-transparent" />

      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {HERO_IMAGES.slice(0, 8).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === currentIndex % 8 ? "w-6 bg-amber-400" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
