"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { motion, useReducedMotion } from "motion/react";
import {
  Expand,
  Minus,
  Plus,
  Scan,
  X,
  GitBranch,
  CircleCheck,
} from "lucide-react";
import type { FlowData, Theme } from "@/lib/deck";
import RevealControls, { type RevealProps } from "./reveal-controls";

type StoryNode = Node<
  { label: string; current: boolean; decision: boolean; step: number },
  "story"
>;
function StoryCard({ data }: NodeProps<StoryNode>) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={`flow-node-card ${data.current ? "current" : ""} ${data.decision ? "decision" : ""}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flow-node-kicker">
        {data.decision ? <GitBranch size={13} /> : <CircleCheck size={13} />}
        <span>STEP {String(data.step + 1).padStart(2, "0")}</span>
      </div>
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}
const nodeTypes = { story: StoryCard };

function FlowCanvas({
  flow,
  reveal,
  expanded,
}: {
  flow: FlowData;
  reveal: RevealProps;
  expanded: boolean;
}) {
  const reduce = useReducedMotion();
  const api = useReactFlow<StoryNode>();
  const initialized = useNodesInitialized();
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const visible = useMemo(
    () => flow.nodes.filter((n) => n.step <= reveal.step),
    [flow.nodes, reveal.step],
  );
  const nodes: StoryNode[] = useMemo(
    () =>
      visible.map((n) => ({
        id: n.id,
        type: "story",
        position: n.position,
        data: {
          label: n.label,
          current: n.step === reveal.step,
          decision: n.kind === "decision",
          step: n.step,
        },
      })),
    [visible, reveal.step],
  );
  const edges = useMemo(() => {
    const ids = new Set(visible.map((n) => n.id));
    return flow.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({
        ...e,
        type: "smoothstep",
        animated:
          !reduce &&
          visible.some((n) => n.id === e.target && n.step === reveal.step),
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "var(--flow-edge)", strokeWidth: 1.7 },
        labelStyle: { fill: "var(--text)", fontSize: 12 },
        labelBgStyle: { fill: "var(--paper)" },
      }));
  }, [flow.edges, visible, reduce, reveal.step]);
  const fit = useCallback(
    (all = false, animate = true) => {
      // Keep the newest handoffs legible instead of shrinking a growing chart.
      const focus = all
        ? visible
        : visible.filter((n) => n.step >= Math.max(0, reveal.step - 2));
      void api.fitView({
        nodes: focus.length ? focus : visible,
        padding: 0.22,
        minZoom: 0.05,
        maxZoom: 1.1,
        duration: reduce || !animate ? 0 : 320,
      });
    },
    [api, visible, reveal.step, reduce],
  );
  useEffect(() => {
    if (!initialized) return;
    const frame = requestAnimationFrame(() => fit(false));
    return () => cancelAnimationFrame(frame);
  }, [initialized, fit, expanded]);
  useEffect(() => {
    if (!viewport.current || !initialized) return;
    const observer = new ResizeObserver(() => fit(false, false));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [fit, initialized]);
  const advance = () =>
    reveal.onChange(Math.min(reveal.count - 1, reveal.step + 1));
  return (
    <>
      <div
        ref={viewport}
        className="flow-viewport"
        tabIndex={0}
        role="region"
        aria-label="Interactive flowchart. Right advances, Left goes back. Drag to pan; scroll to zoom."
        onKeyDown={(e) => {
          if (e.shiftKey && e.key.startsWith("Arrow")) {
            e.preventDefault();
            e.stopPropagation();
            const v = api.getViewport();
            void api.setViewport({
              ...v,
              x:
                v.x +
                (e.key === "ArrowLeft" ? 70 : e.key === "ArrowRight" ? -70 : 0),
              y:
                v.y +
                (e.key === "ArrowUp" ? 70 : e.key === "ArrowDown" ? -70 : 0),
            });
          } else if (["+", "=", "-", "0"].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "0") fit(true);
            else if (e.key === "-") void api.zoomOut();
            else void api.zoomIn();
          }
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          disableKeyboardA11y
          minZoom={0.05}
          maxZoom={3}
          zoomOnDoubleClick={false}
          onPaneClick={advance}
          onNodeClick={advance}
          onMove={(_, v) => setZoom(v.zoom)}
          fitView
          fitViewOptions={{ maxZoom: 1.1, padding: 0.2 }}
        >
          <Background color="var(--flow-grid)" gap={22} size={1} />
        </ReactFlow>
      </div>
      <RevealControls {...reveal} />
      <div className="diagram-toolbar flow-toolbar">
        <span>← Back · Next → · Drag to pan</span>
        <div>
          <button
            aria-label="Zoom out flowchart"
            onClick={() => void api.zoomOut({ duration: reduce ? 0 : 150 })}
          >
            <Minus size={14} />
          </button>
          <output aria-label="Flowchart zoom">{Math.round(zoom * 100)}%</output>
          <button
            aria-label="Zoom in flowchart"
            onClick={() => void api.zoomIn({ duration: reduce ? 0 : 150 })}
          >
            <Plus size={14} />
          </button>
          <button aria-label="Fit flowchart" onClick={() => fit(true)}>
            <Scan size={14} />
            <span>Fit all</span>
          </button>
          <button aria-label="Focus current step" onClick={() => fit(false)}>
            Follow step
          </button>
        </div>
      </div>
    </>
  );
}
function FlowMini({ flow }: { flow: FlowData }) {
  const minX = Math.min(...flow.nodes.map((n) => n.position.x)) - 25;
  const minY = Math.min(...flow.nodes.map((n) => n.position.y)) - 25;
  const maxX = Math.max(...flow.nodes.map((n) => n.position.x)) + 215;
  const maxY = Math.max(...flow.nodes.map((n) => n.position.y)) + 105;
  return (
    <svg
      className="flow-mini"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      aria-hidden="true"
    >
      {flow.edges.map((e) => {
        const a = flow.nodes.find((n) => n.id === e.source)!;
        const b = flow.nodes.find((n) => n.id === e.target)!;
        return (
          <path
            key={e.id}
            d={`M ${a.position.x + 190} ${a.position.y + 40} L ${b.position.x} ${b.position.y + 40}`}
            fill="none"
            stroke="var(--text)"
            strokeWidth={2}
          />
        );
      })}
      {flow.nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.position.x} ${n.position.y})`}>
          <rect
            width={190}
            height={80}
            rx={10}
            fill="var(--paper)"
            stroke="var(--accent)"
            strokeWidth={2}
          />
          <text
            x={95}
            y={44}
            textAnchor="middle"
            fill="var(--text)"
            fontSize={12}
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
export default function FlowChart({
  flow,
  theme,
  reveal,
  mini = false,
}: {
  flow: FlowData;
  theme: Theme;
  reveal: RevealProps;
  mini?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const owned = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setExpanded(false);
    if (owned.current && document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    owned.current = false;
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const change = () => {
      if (owned.current && !document.fullscreenElement) close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
      if (e.key === "Tab") {
        const els = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex="0"]',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", key, true);
      requestAnimationFrame(() => trigger.current?.focus());
    };
  }, [expanded, close]);
  if (mini) return <FlowMini flow={flow} />;
  const panel = (
    <div className="diagram-panel flow-panel">
      {!expanded && (
        <button
          className="flow-expand"
          ref={trigger}
          aria-label="Fullscreen flowchart"
          onClick={() => {
            setExpanded(true);
            if (
              !document.fullscreenElement &&
              document.documentElement.requestFullscreen
            ) {
              owned.current = true;
              void document.documentElement.requestFullscreen().catch(() => {
                owned.current = false;
              });
            }
          }}
        >
          <Expand size={14} />
          <span>Fullscreen</span>
        </button>
      )}
      <ReactFlowProvider>
        <FlowCanvas flow={flow} reveal={reveal} expanded={expanded} />
      </ReactFlowProvider>
    </div>
  );
  return expanded
    ? createPortal(
        <div
          className={`diagram-fullscreen flow-fullscreen theme-${theme}`}
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen flowchart"
          onKeyDown={(e) => {
            if (e.shiftKey) return;
            const next =
              ["ArrowRight", "ArrowDown"].includes(e.key) ||
              (e.key === " " && !(e.target as HTMLElement).closest("button"));
            const back = ["ArrowLeft", "ArrowUp"].includes(e.key);
            if (next || back) {
              e.preventDefault();
              e.stopPropagation();
              reveal.onChange(
                Math.max(
                  0,
                  Math.min(reveal.count - 1, reveal.step + (next ? 1 : -1)),
                ),
              );
            }
          }}
        >
          <header>
            <div>
              <strong>Step-by-step flowchart</strong>
              <span>Right advances · Left goes back</span>
            </div>
            <button aria-label="Close fullscreen flowchart" onClick={close}>
              <X size={20} />
              Close
            </button>
          </header>
          {panel}
        </div>,
        document.body,
      )
    : panel;
}
