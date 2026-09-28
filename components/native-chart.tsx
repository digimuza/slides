"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartData } from "@/lib/chart-schema";
import type { Theme } from "@/lib/deck";

const palettes: Record<Theme, string[]> = {
  editorial: ["#c65332", "#657849", "#d09a35", "#597e93", "#956aa0", "#b66f7a"],
  midnight: ["#fbad79", "#a2c38a", "#e4c96d", "#8bbbd9", "#c5a0e0", "#f19aa8"],
  botanical: ["#46693c", "#9a6a32", "#5a8993", "#92832a", "#886491", "#b66658"],
  "first-horizon": [
    "#0050b5",
    "#008a91",
    "#b87500",
    "#774bbb",
    "#ba4669",
    "#48742d",
  ],
};
const day = 86400000;
const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);

export default function NativeChart({
  chart,
  theme,
  mini = false,
}: {
  chart: ChartData;
  theme: Theme;
  mini?: boolean;
}) {
  const colors = palettes[theme];
  const ink =
    theme === "midnight"
      ? "#ecefe8"
      : theme === "first-horizon"
        ? "#002257"
        : "#30332a";
  if (chart.type === "gantt") {
    const start = Math.min(...chart.tasks.map((task) => timestamp(task.start)));
    const end = Math.max(
      ...chart.tasks.map((task) => timestamp(task.end) + day),
    );
    const span = end - start;
    const x = (time: number) => 210 + ((time - start) / span) * 650;
    const height = Math.max(220, chart.tasks.length * 42 + 55);
    return (
      <div className="native-chart gantt-chart" aria-label="Gantt chart">
        <svg
          viewBox={`0 0 900 ${height}`}
          role="img"
          aria-label={chart.tasks
            .map(
              (task) =>
                `${task.label}: ${task.start} to ${task.end}, ${task.progress || 0}% complete`,
            )
            .join(". ")}
          style={{
            color: ink,
            minHeight: mini ? undefined : Math.min(height, 1300),
          }}
        >
          <title>Project schedule</title>
          {Array.from({ length: 5 }, (_, index) => {
            const date = start + (span * index) / 4;
            return (
              <g key={index}>
                <line
                  x1={x(date)}
                  x2={x(date)}
                  y1={32}
                  y2={height - 8}
                  stroke={ink}
                  opacity={0.12}
                />
                <text
                  x={x(date)}
                  y={20}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize={12}
                >
                  {new Date(date).toISOString().slice(0, 10)}
                </text>
              </g>
            );
          })}
          {chart.tasks.map((task, index) => {
            const left = x(timestamp(task.start));
            const width = x(timestamp(task.end) + day) - left;
            const y = 44 + index * 42;
            return (
              <g key={index}>
                <title>
                  {task.label}: {task.start} – {task.end} · {task.progress || 0}
                  % complete
                </title>
                <text x={12} y={y + 19} fill="currentColor" fontSize={14}>
                  {task.label.length > 24
                    ? `${task.label.slice(0, 23)}…`
                    : task.label}
                </text>
                <rect
                  x={left}
                  y={y}
                  width={width}
                  height={27}
                  rx={5}
                  fill={colors[index % colors.length]}
                  opacity={0.25}
                />
                <rect
                  x={left}
                  y={y}
                  width={(width * (task.progress || 0)) / 100}
                  height={27}
                  rx={5}
                  fill={colors[index % colors.length]}
                />
                {width > 45 && (
                  <text
                    x={left + width / 2}
                    y={y + 19}
                    textAnchor="middle"
                    fill={ink}
                    fontSize={12}
                    paintOrder="stroke"
                    stroke={theme === "midnight" ? "#182020" : "#fff"}
                    strokeWidth={2}
                  >
                    {task.progress || 0}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }
  const data = chart.data.map((point, index) => ({
    ...point,
    fill: colors[index % colors.length],
  }));
  const pie = chart.type === "pie" || chart.type === "donut";
  return (
    <div
      className="native-chart"
      role="group"
      aria-label={`${chart.type} chart: ${chart.data.map((point) => `${point.label}: ${point.value}`).join(", ")}`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        minHeight={0}
      >
        {pie ? (
          <PieChart accessibilityLayer>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={chart.type === "donut" ? "45%" : 0}
              outerRadius="75%"
              isAnimationActive={false}
              label={!mini ? { fill: ink, fontSize: 12 } : false}
            />
            {!mini && <Legend wrapperStyle={{ fontSize: 12, color: ink }} />}
            {!mini && (
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  color: "#30332a",
                  borderRadius: 8,
                }}
              />
            )}
          </PieChart>
        ) : (
          <ComposedChart
            data={data}
            accessibilityLayer
            margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
          >
            <CartesianGrid stroke={ink} strokeOpacity={0.12} vertical={false} />
            <XAxis
              dataKey="label"
              hide={mini}
              tick={{ fill: ink, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              hide={mini}
              tick={{ fill: ink, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={65}
            />
            {!mini && (
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  color: "#30332a",
                  borderRadius: 8,
                }}
              />
            )}
            {chart.type === "bar" && (
              <Bar
                dataKey="value"
                name={chart.valueLabel || "Value"}
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            )}
            {chart.type === "line" && (
              <Line
                dataKey="value"
                name={chart.valueLabel || "Value"}
                stroke={colors[0]}
                strokeWidth={3}
                dot={!mini}
                isAnimationActive={false}
              />
            )}
            {chart.type === "area" && (
              <Area
                dataKey="value"
                name={chart.valueLabel || "Value"}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.2}
                strokeWidth={3}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
