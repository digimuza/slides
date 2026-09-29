"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2 } from "lucide-react";
import type { Deck } from "@/lib/deck";
import { SlideCanvas } from "@/app/studio/page";

export default function SharedPresentation({ deck }: { deck: Deck }) {
  const [active, setActive] = useState(0);
  const [reveal, setReveal] = useState(0);
  const slide = deck.slides[active];
  const previous = useCallback(() => {
    if (reveal > 0) setReveal(reveal - 1);
    else setActive((index) => Math.max(0, index - 1));
  }, [reveal]);
  const next = useCallback(() => {
    if (slide.steps && reveal < slide.steps.length - 1) setReveal(reveal + 1);
    else setActive((index) => Math.min(deck.slides.length - 1, index + 1));
  }, [deck.slides.length, reveal, slide.steps]);

  useEffect(() => setReveal(0), [active]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        setActive(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setActive(deck.slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.slides.length, next, previous]);

  return (
    <main className="shared-viewer">
      <header className="shared-viewer-header">
        <span>{deck.name}</span>
        <span>View only</span>
      </header>
      <div className="shared-viewer-stage">
        <div className="shared-viewer-canvas">
          <SlideCanvas slide={slide} theme={deck.theme} index={active} total={deck.slides.length} revealStep={reveal} onReveal={setReveal} />
        </div>
      </div>
      <nav className="shared-viewer-controls" aria-label="Presentation controls">
        <button type="button" onClick={previous} disabled={active === 0 && reveal === 0} aria-label="Previous slide"><ArrowLeft size={18} /></button>
        <span>{active + 1} / {deck.slides.length}</span>
        <button type="button" onClick={next} disabled={active === deck.slides.length - 1 && (!slide.steps || reveal === slide.steps.length - 1)} aria-label="Next slide"><ArrowRight size={18} /></button>
        <button type="button" onClick={() => void document.documentElement.requestFullscreen?.()} aria-label="View fullscreen"><Maximize2 size={18} /></button>
      </nav>
    </main>
  );
}
