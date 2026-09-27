"use client";
import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Slide } from "@/lib/deck";
import RevealControls from "./reveal-controls";
export default function CodeReveal({
  slide,
  step,
  onChange,
  mini,
}: {
  slide: Slide;
  step: number;
  onChange?: (step: number) => void;
  mini: boolean;
}) {
  const reduce = useReducedMotion();
  const scroll = useRef<HTMLPreElement>(null);
  const steps = slide.steps || [];
  useEffect(() => {
    if (scroll.current)
      scroll.current.scrollTo({
        top: scroll.current.scrollHeight,
        behavior: reduce ? "instant" : "smooth",
      });
  }, [step, reduce]);
  let lineNumber = 0;
  return (
    <div className={`code-panel ${mini ? "code-mini" : ""}`}>
      <div className="code-file">
        <span>● ● ●</span>
        <span>{slide.fileName || "example.txt"}</span>
        <span>{slide.language || "text"}</span>
      </div>
      <pre
        ref={scroll}
        tabIndex={mini ? undefined : 0}
        aria-label="Revealed code"
        onClick={() => onChange?.(Math.min(step + 1, steps.length - 1))}
      >
        <code>
          {steps.slice(0, step + 1).map((s, block) => (
            <span
              className={`code-block ${block === step ? "code-current" : ""}`}
              key={block}
            >
              {(s.code || "")
                .replace(/\n$/, "")
                .split("\n")
                .map((line, i) => (
                  <motion.span
                    className="code-line"
                    key={i}
                    initial={mini || reduce ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.24,
                      delay: reduce ? 0 : Math.min(i * 0.035, 0.3),
                    }}
                  >
                    <span className="line-number" aria-hidden="true">
                      {++lineNumber}
                    </span>
                    <span>{line || " "}</span>
                  </motion.span>
                ))}
            </span>
          ))}
        </code>
      </pre>
      {!mini && onChange && (
        <RevealControls
          step={step}
          count={steps.length}
          label={steps[step]?.label || ""}
          onChange={onChange}
        />
      )}
    </div>
  );
}
