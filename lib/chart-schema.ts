import { z } from "zod";

const label = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim().length > 0, "Add a label.");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a valid date (YYYY-MM-DD).");
export const chartSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.enum(["pie", "donut", "bar", "line", "area"]),
        data: z
          .array(
            z
              .object({
                label,
                value: z.number().finite().min(-1e12).max(1e12),
              })
              .strict(),
          )
          .min(1)
          .max(50),
        valueLabel: z.string().max(100).optional(),
      })
      .strict(),
    z
      .object({
        type: z.literal("gantt"),
        tasks: z
          .array(
            z
              .object({
                label,
                start: date,
                end: date,
                progress: z.number().min(0).max(100).optional(),
              })
              .strict()
              .refine(
                (task) => task.end >= task.start,
                "End date must be on or after start date.",
              ),
          )
          .min(1)
          .max(30),
      })
      .strict(),
  ])
  .superRefine((chart, ctx) => {
    if (
      (chart.type === "pie" || chart.type === "donut") &&
      (chart.data.some((point) => point.value < 0) ||
        !chart.data.some((point) => point.value > 0))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["data"],
        message:
          "Pie and donut charts need non-negative values and at least one positive value.",
      });
    }
  });
export type ChartData = z.infer<typeof chartSchema>;
