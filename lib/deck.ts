import { chartSchema, type ChartData } from "./chart-schema";
import {
  codeRevealSlide,
  flowRevealSlide,
  legacyFlowSource,
  legacyFlowSteps,
} from "./reveal-samples";
import { sequenceSource } from "./sequence";
export type Layout =
  | "cover"
  | "statement"
  | "metrics"
  | "comparison"
  | "quote"
  | "closing"
  | "diagram"
  | "code"
  | "flowchart"
  | "chart";
export type Theme = "editorial" | "midnight" | "botanical" | "first-horizon";
export type FlowData = {
  nodes: {
    id: string;
    label: string;
    position: { x: number; y: number };
    step: number;
    kind?: "process" | "decision";
  }[];
  edges: { id: string; source: string; target: string; label?: string }[];
};
export type Slide = {
  id: string;
  layout: Layout;
  eyebrow: string;
  title: string;
  description: string;
  notes: string;
  mermaid?: string;
  flow?: FlowData;
  chart?: ChartData;
  fileName?: string;
  language?: string;
  steps?: { label: string; code?: string; mermaid?: string }[];
  items?: { label: string; value: string; detail?: string }[];
};
export type Deck = { name: string; theme: Theme; slides: Slide[] };
export const sampleDeck: Deck = {
  name: "A little more possibility",
  theme: "editorial",
  slides: [
    {
      id: "01",
      layout: "cover",
      eyebrow: "A FRESH PERSPECTIVE · 2026",
      title: "Good ideas.\nGreat possibilities.",
      description:
        "A little curiosity can change everything.\nLet’s see where it takes us.",
      notes:
        "Start with a moment of possibility. Introduce the big idea and invite your audience to imagine what comes next.",
    },
    {
      id: "02",
      layout: "statement",
      eyebrow: "01 / THE BIG IDEA",
      title: "The future belongs\nto the curious.",
      description:
        "Progress starts with a better question. We’re here to challenge the familiar, connect the unexpected, and make room for what’s next.",
      notes:
        "Share the central idea: curiosity is the starting point for meaningful progress.",
    },
    {
      id: "03",
      layout: "metrics",
      eyebrow: "02 / SMALL STEPS, REAL IMPACT",
      title: "A little change.\nA lot of momentum.",
      description: "The numbers tell a story. And we’re just getting started.",
      notes:
        "These are illustrative sample metrics. Replace them with the numbers that matter to your audience.",
      items: [
        {
          value: "92%",
          label: "A clearer direction",
          detail: "Teams aligned on a shared vision",
        },
        {
          value: "3.5×",
          label: "More possibilities",
          detail: "Ideas turned into experiments",
        },
        {
          value: "24",
          label: "Countries connected",
          detail: "Different perspectives. One purpose.",
        },
      ],
    },
    {
      id: "04",
      layout: "comparison",
      eyebrow: "03 / A DIFFERENT WAY FORWARD",
      title: "Less of the same.\nMore of what matters.",
      description: "A small shift in perspective makes all the difference.",
      notes:
        "Talk through how the approach changes from the familiar to the possible.",
      items: [
        {
          value: "The familiar",
          label: "Playing it safe\nWorking in silos\nWaiting for perfect",
        },
        {
          value: "The possible",
          label: "Asking what if\nCreating together\nStarting with something",
        },
      ],
    },
    {
      id: "05",
      layout: "quote",
      eyebrow: "04 / A THOUGHT TO TAKE WITH YOU",
      title:
        "Great things are done by a series of small things brought together.",
      description: "Vincent van Gogh",
      notes:
        "Pause here. Let the audience connect this thought to their own work.",
    },
    {
      id: "sequence-reference",
      layout: "diagram",
      eyebrow: "05 / THE COMPLETE PICTURE",
      title: "From checkout to doorstep.",
      description: "An end-to-end order journey across ten participants.",
      notes:
        "Zoom into each stage: authentication, inventory, payment, event delivery, and fulfillment. Drag to follow the flow. Use Fit to return to the complete diagram.",
      mermaid: sequenceSource,
    },
    flowRevealSlide,
    codeRevealSlide,
    {
      id: "06",
      layout: "closing",
      eyebrow: "THE NEXT CHAPTER",
      title: "Let’s make\nsomething matter.",
      description:
        "One idea. One conversation. One next step.\nThe possibility starts with you.",
      notes: "Close with a clear next step and open the floor for questions.",
    },
  ],
};
export function parseDeck(input: string): Deck {
  const d = JSON.parse(input);
  if (
    !d ||
    typeof d.name !== "string" ||
    !["editorial", "midnight", "botanical", "first-horizon"].includes(d.theme) ||
    !Array.isArray(d.slides) ||
    d.slides.length < 1 ||
    d.slides.length > 100
  )
    throw new Error("Add a name, a valid theme, and between 1 and 100 slides.");
  const ids = new Set();
  for (const [i, s] of d.slides.entries()) {
    if (
      !s ||
      ![
        "cover",
        "statement",
        "metrics",
        "comparison",
        "quote",
        "closing",
        "diagram",
        "code",
        "flowchart",
        "chart",
      ].includes(s.layout) ||
      ["id", "eyebrow", "title", "description", "notes"].some(
        (k) => typeof s[k] !== "string",
      ) ||
      ids.has(s.id)
    )
      throw new Error(
        `Slide ${i + 1}: use a unique id, valid layout, and text fields (eyebrow, title, description, notes).`,
      );
    ids.add(s.id);
    if (s.layout === "chart") {
      const result = chartSchema.safeParse(s.chart);
      if (!result.success) throw new Error(`Slide ${i + 1}: ${result.error.issues.map((issue) => issue.message).join(" ")}`);
    } else if (s.chart !== undefined) {
      throw new Error(`Slide ${i + 1}: only chart slides support chart data.`);
    }
    if (s.advanceKey !== undefined && !["left", "right"].includes(s.advanceKey))
      throw new Error(`Slide ${i + 1}: advanceKey must be left or right.`);
    if (
      ["fileName", "language"].some(
        (k) => s[k] !== undefined && typeof s[k] !== "string",
      )
    )
      throw new Error(`Slide ${i + 1}: fileName and language must be text.`);
    if (
      s.steps !== undefined &&
      (!["code", "diagram", "flowchart"].includes(s.layout) ||
        !Array.isArray(s.steps) ||
        s.steps.length < 1 ||
        s.steps.length > 50 ||
        s.steps.some(
          (step: { label?: unknown; code?: unknown; mermaid?: unknown }) =>
            !step ||
            typeof step.label !== "string" ||
            (s.layout === "flowchart"
              ? false
              : s.layout === "code"
                ? typeof step.code !== "string" || step.code.length > 50000
                : typeof step.mermaid !== "string" ||
                  !step.mermaid.trim() ||
                  step.mermaid.length > 50000),
        ))
    )
      throw new Error(
        `Slide ${i + 1}: add 1–50 steps with a label and ${s.layout === "code" ? "code" : "mermaid"} source.`,
      );
    if (["code", "flowchart"].includes(s.layout) && !s.steps)
      throw new Error(`Slide ${i + 1}: code slides require reveal steps.`);
    if (s.layout === "flowchart") {
      const f = s.flow as FlowData;
      const validNodes =
        f &&
        Array.isArray(f.nodes) &&
        f.nodes.length > 0 &&
        f.nodes.length <= 100 &&
        f.nodes.every(
          (n) =>
            n &&
            typeof n.id === "string" &&
            n.id.length > 0 &&
            typeof n.label === "string" &&
            n.position &&
            [n.position.x, n.position.y].every(
              (v) =>
                typeof v === "number" &&
                Number.isFinite(v) &&
                Math.abs(v) <= 1000000,
            ) &&
            Number.isInteger(n.step) &&
            n.step >= 0 &&
            n.step < s.steps.length &&
            (n.kind === undefined || ["process", "decision"].includes(n.kind)),
        );
      const nodeIds = new Set(validNodes ? f.nodes.map((n) => n.id) : []);
      if (
        !validNodes ||
        nodeIds.size !== f.nodes.length ||
        !Array.isArray(f.edges) ||
        f.edges.length > 300 ||
        new Set(f.edges.map((e) => e?.id)).size !== f.edges.length ||
        f.edges.some(
          (e) =>
            !e ||
            typeof e.id !== "string" ||
            !nodeIds.has(e.source) ||
            !nodeIds.has(e.target) ||
            (e.label !== undefined && typeof e.label !== "string"),
        )
      )
        throw new Error(
          `Slide ${i + 1}: flowchart needs unique nodes with labels, finite x/y positions, valid step indices, and edges referencing those nodes.`,
        );
    }
    if (
      s.layout === "diagram" &&
      !s.steps &&
      (typeof s.mermaid !== "string" ||
        !s.mermaid.trim() ||
        s.mermaid.length > 50000)
    )
      throw new Error(
        `Slide ${i + 1}: diagram slides require Mermaid source (1–50,000 characters).`,
      );
    if (
      s.items !== undefined &&
      (!Array.isArray(s.items) ||
        s.items.some(
          (v: { label: unknown; value: unknown; detail?: unknown }) =>
            !v ||
            typeof v.label !== "string" ||
            typeof v.value !== "string" ||
            (v.detail !== undefined && typeof v.detail !== "string"),
        ))
    )
      throw new Error(`Slide ${i + 1}: items need text values and labels.`);
    if (
      ["metrics", "comparison"].includes(s.layout) &&
      (!s.items || s.items.length < 1 || s.items.length > 4)
    )
      throw new Error(`Slide ${i + 1}: add 1–4 items.`);
  }
  // Migrate only the unchanged legacy reference graph; preserve custom diagrams.
  d.slides = d.slides.map((slide: Slide & { advanceKey?: string }) => {
    const { advanceKey: _legacyKey, ...rest } = slide;
    if (
      slide.layout === "diagram" &&
      slide.mermaid === legacyFlowSource &&
      JSON.stringify(slide.steps) === JSON.stringify(legacyFlowSteps)
    ) {
      const { mermaid: _source, ...fields } = rest;
      return {
        ...fields,
        layout: "flowchart",
        flow: structuredClone(flowRevealSlide.flow),
        steps: structuredClone(flowRevealSlide.steps),
        description: flowRevealSlide.description,
      };
    }
    return rest;
  });
  return d as Deck;
}
