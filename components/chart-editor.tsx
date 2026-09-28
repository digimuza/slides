"use client";

import { useEffect, useState } from "react";
import { chartSchema, type ChartData } from "@/lib/chart-schema";

export default function ChartEditor({
  chart,
  onChange,
}: {
  chart: ChartData;
  onChange: (chart: ChartData) => void;
}) {
  const [draft, setDraft] = useState(chart);
  useEffect(() => setDraft(chart), [chart]);
  const parsed = chartSchema.safeParse(draft);
  function update(next: ChartData) {
    setDraft(next);
    const result = chartSchema.safeParse(next);
    if (result.success) onChange(result.data);
  }
  return (
    <div className="chart-editor">
      <h3>Chart data</h3>
      {draft.type !== "gantt" && (
        <>
          <label>
            Chart type
            <select
              aria-label="Chart type"
              value={draft.type}
              onChange={(event) =>
                update({
                  ...draft,
                  type: event.target.value as typeof draft.type,
                })
              }
            >
              {["pie", "donut", "bar", "line", "area"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Value label
            <input
              value={draft.valueLabel || ""}
              maxLength={100}
              onChange={(event) =>
                update({ ...draft, valueLabel: event.target.value })
              }
            />
          </label>
        </>
      )}
      {draft.type === "gantt"
        ? draft.tasks.map((task, index) => (
            <fieldset key={index}>
              <legend>Task {index + 1}</legend>
              <label>
                Task name
                <input
                  aria-label={`Task ${index + 1} name`}
                  maxLength={200}
                  value={task.label}
                  onChange={(event) =>
                    update({
                      ...draft,
                      tasks: draft.tasks.map((item, i) =>
                        i === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              {(["start", "end"] as const).map((field) => (
                <label key={field}>
                  {field === "start" ? "Start date" : "End date"}
                  <input
                    type="date"
                    aria-label={`Task ${index + 1} ${field}`}
                    value={task[field]}
                    onChange={(event) =>
                      update({
                        ...draft,
                        tasks: draft.tasks.map((item, i) =>
                          i === index
                            ? { ...item, [field]: event.target.value }
                            : item,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <label>
                Complete (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label={`Task ${index + 1} progress`}
                  value={Number.isFinite(task.progress) ? task.progress : ""}
                  onChange={(event) =>
                    update({
                      ...draft,
                      tasks: draft.tasks.map((item, i) =>
                        i === index
                          ? { ...item, progress: event.target.valueAsNumber }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <button
                className="button"
                disabled={draft.tasks.length === 1}
                onClick={() =>
                  update({
                    ...draft,
                    tasks: draft.tasks.filter((_, i) => i !== index),
                  })
                }
              >
                Remove task {index + 1}
              </button>
            </fieldset>
          ))
        : draft.data.map((point, index) => (
            <fieldset key={index}>
              <legend>Point {index + 1}</legend>
              <label>
                Label
                <input
                  aria-label={`Point ${index + 1} label`}
                  maxLength={200}
                  value={point.label}
                  onChange={(event) =>
                    update({
                      ...draft,
                      data: draft.data.map((item, i) =>
                        i === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Value
                <input
                  type="number"
                  step="any"
                  aria-label={`Point ${index + 1} value`}
                  value={Number.isFinite(point.value) ? point.value : ""}
                  onChange={(event) =>
                    update({
                      ...draft,
                      data: draft.data.map((item, i) =>
                        i === index
                          ? { ...item, value: event.target.valueAsNumber }
                          : item,
                      ),
                    })
                  }
                />
              </label>
              <button
                className="button"
                disabled={draft.data.length === 1}
                onClick={() =>
                  update({
                    ...draft,
                    data: draft.data.filter((_, i) => i !== index),
                  })
                }
              >
                Remove point {index + 1}
              </button>
            </fieldset>
          ))}
      {!parsed.success && (
        <p role="alert">
          {parsed.error.issues[0].message} The preview keeps your last valid
          data.
        </p>
      )}
      {draft.type === "gantt" ? (
        <button
          className="button"
          disabled={draft.tasks.length >= 30}
          onClick={() =>
            update({
              ...draft,
              tasks: [
                ...draft.tasks,
                {
                  label: "New task",
                  start: draft.tasks.at(-1)!.end,
                  end: draft.tasks.at(-1)!.end,
                  progress: 0,
                },
              ],
            })
          }
        >
          Add task
        </button>
      ) : (
        <button
          className="button"
          disabled={draft.data.length >= 50}
          onClick={() =>
            update({
              ...draft,
              data: [
                ...draft.data,
                { label: `Item ${draft.data.length + 1}`, value: 10 },
              ],
            })
          }
        >
          Add data point
        </button>
      )}
    </div>
  );
}
