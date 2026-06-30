"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSlideCard, type HeroSliderSlide } from "@/components/storefront/hero-slide-card";
import { HeroSliderControls } from "@/components/storefront/hero-slider-controls";

export function HeroSlider({ slides }: { slides: HeroSliderSlide[] }) {
  const safeSlides = useMemo(() => slides.filter((slide) => slide.desktopImageUrl && slide.title), [slides]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const count = safeSlides.length;

  const scrollToIndex = useCallback((nextIndex: number, manual = true) => {
    if (!count) return;
    const normalizedIndex = (nextIndex + count) % count;
    const track = trackRef.current;
    setIndex(normalizedIndex);
    if (manual) setManuallyPaused(true);
    if (track) {
      track.scrollTo({ left: normalizedIndex * track.clientWidth, behavior: "smooth" });
    }
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !count) return;

    const handleScroll = () => {
      const nextIndex = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      setIndex(Math.min(Math.max(nextIndex, 0), count - 1));
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => track.removeEventListener("scroll", handleScroll);
  }, [count]);

  useEffect(() => {
    if (count <= 1 || paused || manuallyPaused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => scrollToIndex(index + 1, false), 6500);
    return () => window.clearInterval(timer);
  }, [count, index, paused, manuallyPaused, scrollToIndex]);

  if (!count) return null;

  return (
    <section
      className="relative w-screen max-w-none [margin-left:calc(50%-50vw)] [margin-right:calc(50%-50vw)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Homepage hero slides"
    >
      <div className="relative overflow-hidden">
        <div ref={trackRef} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {safeSlides.map((slide, slideIndex) => (
            <div key={slide.id} className="min-w-full snap-start">
              <HeroSlideCard slide={slide} active={slideIndex === index} />
            </div>
          ))}
        </div>
        <HeroSliderControls count={count} current={index} onPrevious={() => scrollToIndex(index - 1)} onNext={() => scrollToIndex(index + 1)} onSelect={(next) => scrollToIndex(next)} />
      </div>
    </section>
  );
}
