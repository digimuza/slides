import type { Slide } from "./deck";
import type { ChartData } from "./chart-schema";

export const chartTemplates: { name: string; slide: Slide }[] = [
  {
    name: "Gantt chart",
    title: "A plan for what’s next.",
    description: "Project dates and task completion.",
    chart: {
      type: "gantt",
      tasks: [
        {
          label: "Research",
          start: "2026-10-01",
          end: "2026-10-07",
          progress: 100,
        },
        {
          label: "Design",
          start: "2026-10-08",
          end: "2026-10-16",
          progress: 60,
        },
        {
          label: "Build",
          start: "2026-10-15",
          end: "2026-10-28",
          progress: 20,
        },
        {
          label: "Launch",
          start: "2026-10-29",
          end: "2026-10-30",
          progress: 0,
        },
      ],
    },
  },
  ...(["pie", "donut", "bar", "line", "area"] as const).map((type) => ({
    name: `${type[0].toUpperCase()}${type.slice(1)} chart`,
    title:
      type === "pie" || type === "donut"
        ? "Every part tells a story."
        : "Momentum, quarter by quarter.",
    description:
      type === "pie" || type === "donut"
        ? "How our investment is shared."
        : "Follow progress across the year.",
    chart: {
      type,
      valueLabel: "Investment",
      data: [
        { label: "Q1", value: 32 },
        { label: "Q2", value: 48 },
        { label: "Q3", value: 65 },
        { label: "Q4", value: 88 },
      ],
    },
  })),
].map(({ name, ...content }) => ({
  name,
  slide: {
    ...content,
    chart: content.chart as ChartData,
    id: name.toLowerCase().replaceAll(" ", "-"),
    layout: "chart",
    eyebrow: name.toUpperCase(),
    notes: "Illustrative data. Edit the chart in Content.",
  },
}));
