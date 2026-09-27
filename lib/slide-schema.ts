import { z } from "zod";

const text = z.string().max(50_000);
const item = z
  .object({
    value: z.string().max(200),
    label: z.string().max(2_000),
    detail: z.string().max(2_000).optional(),
  })
  .strict();
const step = z
  .object({
    label: z.string().min(1).max(200),
    code: text.optional(),
    mermaid: z.string().min(1).max(50_000).optional(),
  })
  .strict();
const flowNode = z
  .object({
    id: z.string().min(1).max(120),
    label: z.string().min(1).max(300),
    position: z
      .object({
        x: z.number().finite().min(-1_000_000).max(1_000_000),
        y: z.number().finite().min(-1_000_000).max(1_000_000),
      })
      .strict(),
    step: z.number().int().min(0),
    kind: z.enum(["process", "decision"]).optional(),
  })
  .strict();
const flowEdge = z
  .object({
    id: z.string().min(1).max(120),
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().max(300).optional(),
  })
  .strict();
const flow = z
  .object({
    nodes: z.array(flowNode).min(1).max(100),
    edges: z.array(flowEdge).max(300),
  })
  .strict();
export const slideSchema = z
  .object({
    id: z.string().min(1).max(120),
    layout: z.enum([
      "cover",
      "statement",
      "metrics",
      "comparison",
      "quote",
      "closing",
      "diagram",
      "code",
      "flowchart",
    ]),
    eyebrow: z.string().max(300),
    title: z.string().min(1).max(2_000),
    description: text,
    notes: text,
    mermaid: text.optional(),
    fileName: z.string().max(300).optional(),
    language: z.string().max(80).optional(),
    steps: z.array(step).min(1).max(50).optional(),
    items: z.array(item).max(4).optional(),
    flow: flow.optional(),
  })
  .strict()
  .superRefine((slide, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (
      ["metrics", "comparison"].includes(slide.layout) &&
      !slide.items?.length
    )
      issue(["items"], "This layout needs 1–4 items.");
    if (
      slide.layout === "code" &&
      (!slide.steps?.length || slide.steps.some((s) => s.code === undefined))
    )
      issue(["steps"], "Code slides need code in every step.");
    if (
      slide.layout === "diagram" &&
      !slide.mermaid?.trim() &&
      !slide.steps?.length
    )
      issue(["mermaid"], "Diagram slides need Mermaid source or steps.");
    if (
      slide.layout === "diagram" &&
      slide.steps?.some((s) => !s.mermaid?.trim())
    )
      issue(["steps"], "Every diagram step needs Mermaid source.");
    if (slide.layout === "flowchart") {
      if (!slide.steps?.length)
        issue(["steps"], "Flowcharts need reveal steps.");
      if (!slide.flow) issue(["flow"], "Flowcharts need nodes and edges.");
    }
    if (slide.steps && !["diagram", "flowchart", "code"].includes(slide.layout))
      issue(["steps"], "This layout does not support reveal steps.");
    if (slide.flow && slide.layout !== "flowchart")
      issue(["flow"], "Only flowcharts support flow data.");
    if (!slide.flow) return;
    const ids = new Set<string>();
    for (const [i, node] of slide.flow.nodes.entries()) {
      if (ids.has(node.id))
        issue(["flow", "nodes", i, "id"], "Node ids must be unique.");
      ids.add(node.id);
      if (slide.steps && node.step >= slide.steps.length)
        issue(["flow", "nodes", i, "step"], "Step must exist in this slide.");
    }
    const edgeIds = new Set<string>();
    for (const [i, edge] of slide.flow.edges.entries()) {
      if (edgeIds.has(edge.id))
        issue(["flow", "edges", i, "id"], "Edge ids must be unique.");
      edgeIds.add(edge.id);
      if (!ids.has(edge.source))
        issue(["flow", "edges", i, "source"], "Source node does not exist.");
      if (!ids.has(edge.target))
        issue(["flow", "edges", i, "target"], "Target node does not exist.");
    }
  });
export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    theme: z.enum(["editorial", "midnight", "botanical"]).default("editorial"),
  })
  .strict();
export const projectPatchSchema = projectInputSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Provide a field to update.");
export const deckSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    theme: z.enum(["editorial", "midnight", "botanical"]),
    slides: z.array(slideSchema).min(1).max(100),
  })
  .strict()
  .superRefine((deck, ctx) => {
    const seen = new Set<string>();
    deck.slides.forEach((slide, i) => {
      if (seen.has(slide.id))
        ctx.addIssue({
          code: "custom",
          path: ["slides", i, "id"],
          message: "Slide ids must be unique within a project.",
        });
      seen.add(slide.id);
    });
  });
export const slidePatchSchema = z
  .object({
    id: z.string().min(1).max(120).optional(),
    layout: z
      .enum([
        "cover",
        "statement",
        "metrics",
        "comparison",
        "quote",
        "closing",
        "diagram",
        "code",
        "flowchart",
      ])
      .optional(),
    eyebrow: z.string().max(300).optional(),
    title: z.string().min(1).max(2_000).optional(),
    description: text.optional(),
    notes: text.optional(),
    mermaid: text.optional(),
    fileName: z.string().max(300).optional(),
    language: z.string().max(80).optional(),
    steps: z.array(step).min(1).max(50).optional(),
    items: z.array(item).max(4).optional(),
    flow: flow.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide a field to update.");
export type ValidSlide = z.infer<typeof slideSchema>;
export type ValidDeck = z.infer<typeof deckSchema>;
