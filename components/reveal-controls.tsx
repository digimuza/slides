"use client";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
export type RevealProps = {
  step: number;
  count: number;
  label: string;
  onChange: (step: number) => void;
};
export default function RevealControls({
  step,
  count,
  label,
  onChange,
}: RevealProps) {
  return (
    <div className="reveal-controls" onClick={(e) => e.stopPropagation()}>
      <span className="reveal-caption" aria-live="polite">
        <b>
          Step {step + 1} / {count}
        </b>
        <span>{label}</span>
      </span>
      <div>
        <button
          aria-label="Restart reveal"
          disabled={step === 0}
          onClick={() => onChange(0)}
        >
          <RotateCcw size={13} />
        </button>
        <button
          aria-label="Back step"
          disabled={step === 0}
          onClick={() => onChange(step - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <button
          aria-label="Reveal next step"
          disabled={step === count - 1}
          onClick={() => onChange(step + 1)}
        >
          Next step
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
