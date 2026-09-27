"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import { createPortal } from "react-dom";
import { Expand, Minus, Plus, Scan, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import RevealControls, { type RevealProps } from "./reveal-controls";
import type { Theme } from "@/lib/deck";

// Mermaid has global configuration: serialize configuration and rendering.
let renderQueue: Promise<unknown> = Promise.resolve();
let renderId = 0;
type Diagram = { svg: string; width: number; height: number };
function renderDiagram(source: string, theme: Theme): Promise<Diagram> {
  const job = renderQueue
    .catch(() => {})
    .then(async () => {
      const mermaid = (await import("mermaid")).default;
      const dark = theme === "midnight";
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        suppressErrorRendering: true,
        theme: dark ? "dark" : "base",
        themeVariables: dark
          ? { fontFamily: "Arial, sans-serif" }
          : theme === "first-horizon"
          ? {
              fontFamily: "Arial, sans-serif",
              primaryColor: "#e5f1ff",
              primaryTextColor: "#002257",
              primaryBorderColor: "#0050b5",
              lineColor: "#0050b5",
              actorBkg: "#e5f1ff",
              actorTextColor: "#002257",
              actorBorder: "#0050b5",
              signalColor: "#0050b5",
              signalTextColor: "#002257",
              noteBkgColor: "#ffffff",
              noteTextColor: "#002257",
            }
          : {
              fontFamily: "Arial, sans-serif",
              primaryColor: theme === "botanical" ? "#dde6cf" : "#f5e5d7",
              primaryTextColor: "#30332a",
              primaryBorderColor: "#939580",
              lineColor: "#747865",
              actorBkg: theme === "botanical" ? "#dde6cf" : "#f5e5d7",
              actorTextColor: "#30332a",
              actorBorder: "#939580",
              signalColor: "#555d48",
              signalTextColor: "#30332a",
              noteBkgColor: "#eeeddc",
              noteTextColor: "#30332a",
            },
        sequence: {
          useMaxWidth: false,
          mirrorActors: false,
          actorMargin: 35,
          messageMargin: 30,
        },
      });
      // Measure SVG offscreen so Mermaid's temporary markup never flashes
      // below the app or changes page scroll dimensions.
      const host = document.createElement("div");
      host.style.cssText =
        "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
      document.body.appendChild(host);
      let svg: string;
      try {
        ({ svg } = await mermaid.render(
          `folio-mermaid-${++renderId}`,
          source,
          host,
        ));
      } finally {
        host.remove();
      }
      const element = new DOMParser().parseFromString(
        svg,
        "image/svg+xml",
      ).documentElement;
      const bounds = element
        .getAttribute("viewBox")
        ?.split(/[ ,]+/)
        .map(Number);
      return { svg, width: bounds?.[2] || 1200, height: bounds?.[3] || 800 };
    });
  renderQueue = job;
  return job;
}

export default function MermaidDiagram({
  source,
  theme,
  mini = false,
  reveal,
}: {
  source: string;
  theme: Theme;
  mini?: boolean;
  reveal?: RevealProps;
}) {
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const ownsFullscreen = useRef(false);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const fullscreenPanel = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const container = useRef<HTMLDivElement>(null);
  const controls = useRef<ReactZoomPanPinchRef>(null);
  const reduce = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0, moved: false });
  useEffect(() => {
    let cancelled = false;
    setError("");
    const timer = setTimeout(() => {
      renderDiagram(source, theme)
        .then((result) => {
          if (!cancelled) setDiagram(result);
        })
        .catch((err) => {
          if (!cancelled)
            setError(
              err instanceof Error
                ? err.message
                : "Unable to render this Mermaid diagram.",
            );
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, theme]);
  const fit = useCallback(() => {
    if (!diagram || !container.current) return;
    const { clientWidth: width, clientHeight: height } = container.current;
    const nextScale = Math.max(
      0.01,
      Math.min((width - 24) / diagram.width, (height - 24) / diagram.height, 1),
    );
    controls.current?.setTransform(
      (width - diagram.width * nextScale) / 2,
      (height - diagram.height * nextScale) / 2,
      nextScale,
      0,
    );
  }, [diagram]);
  useEffect(() => {
    if (!container.current || !diagram || mini) return;
    const observer = new ResizeObserver(fit);
    observer.observe(container.current);
    fit();
    return () => observer.disconnect();
  }, [diagram, mini, fit, expanded]);
  const closeFullscreen = useCallback(() => {
    setExpanded(false);
    if (ownsFullscreen.current && document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
    ownsFullscreen.current = false;
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    fullscreenPanel.current?.querySelector<HTMLElement>("button")?.focus();
    const onFullscreenChange = () => {
      if (ownsFullscreen.current && !document.fullscreenElement)
        closeFullscreen();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeFullscreen();
      }
      if (e.key === "Tab") {
        const elements = fullscreenPanel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"]',
        );
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown, true);
      requestAnimationFrame(() => fullscreenButton.current?.focus());
    };
  }, [expanded, closeFullscreen]);
  if (mini)
    return (
      <div className="diagram-mini" aria-hidden="true">
        {diagram ? (
          <div dangerouslySetInnerHTML={{ __html: diagram.svg }} />
        ) : (
          <span>{error ? "Diagram needs attention" : "Sequence diagram"}</span>
        )}
      </div>
    );
  const duration = reduce ? 0 : 160;
  const panel = (
    <div className="diagram-panel">
      <div
        className="diagram-viewport"
        ref={container}
        tabIndex={0}
        role="region"
        onPointerDown={(e) => {
          pointer.current = { x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          if (
            Math.hypot(
              e.clientX - pointer.current.x,
              e.clientY - pointer.current.y,
            ) > 5
          )
            pointer.current.moved = true;
        }}
        onClick={(e) => {
          if (e.button === 0 && !pointer.current.moved && reveal)
            reveal.onChange(Math.min(reveal.step + 1, reveal.count - 1));
        }}
        aria-label="Interactive Mermaid diagram. Drag to pan, scroll or pinch to zoom. Plus and minus zoom, zero fits. Shift and arrow keys pan."
        onKeyDown={(e) => {
          const api = controls.current;
          if (!api || (e.target as HTMLElement).closest("button")) return;
          if (
            ["+", "=", "-", "0"].includes(e.key) ||
            (e.shiftKey && e.key.startsWith("Arrow"))
          ) {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "+" || e.key === "=") api.zoomIn(0.4, duration);
            else if (e.key === "-") api.zoomOut(0.4, duration);
            else if (e.key === "0") fit();
            else {
              const s = api.instance.state;
              api.setTransform(
                s.positionX +
                  (e.key === "ArrowLeft"
                    ? 60
                    : e.key === "ArrowRight"
                      ? -60
                      : 0),
                s.positionY +
                  (e.key === "ArrowUp" ? 60 : e.key === "ArrowDown" ? -60 : 0),
                s.scale,
                duration,
              );
            }
          }
        }}
      >
        {error ? (
          <div className="diagram-error" role="alert">
            <strong>Check your Mermaid syntax</strong>
            <pre>{error}</pre>
            <span>Edit the source in Content to try again.</span>
          </div>
        ) : !diagram ? (
          <div className="diagram-loading" role="status">
            Drawing your diagram…
          </div>
        ) : (
          <TransformWrapper
            ref={controls}
            minScale={0.01}
            maxScale={4}
            limitToBounds={false}
            onInit={fit}
            onTransform={(_, state) => setScale(state.scale)}
            velocityAnimation={{ disabled: true }}
            autoAlignment={{ disabled: true }}
            doubleClick={{ disabled: true }}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: diagram.width, height: diagram.height }}
            >
              <motion.div
                key={diagram.svg}
                initial={mini || reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="diagram-svg"
                style={{ width: diagram.width, height: diagram.height }}
                dangerouslySetInnerHTML={{ __html: diagram.svg }}
              />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>
      {reveal && <RevealControls {...reveal} />}
      <div className="diagram-toolbar">
        <span>Drag to pan · Scroll or pinch to zoom</span>
        <div>
          <button
            aria-label="Zoom out diagram"
            disabled={!diagram}
            onClick={() => controls.current?.zoomOut(0.4, duration)}
          >
            <Minus size={14} />
          </button>
          <button
            aria-label="Actual size diagram"
            title="Read at 100%"
            disabled={!diagram}
            onClick={() => controls.current?.setTransform(12, 12, 1, duration)}
          >
            100%
          </button>
          <output aria-label="Diagram zoom">{Math.round(scale * 100)}%</output>
          <button
            aria-label="Zoom in diagram"
            disabled={!diagram}
            onClick={() => controls.current?.zoomIn(0.4, duration)}
          >
            <Plus size={14} />
          </button>
          {!expanded && (
            <button
              ref={fullscreenButton}
              aria-label="Fullscreen diagram"
              onKeyDown={(e) => {
                if (
                  !reveal ||
                  e.shiftKey ||
                  (e.target as HTMLElement).closest("input, textarea")
                )
                  return;
                const forward =
                  e.key === "ArrowRight" ||
                  e.key === "ArrowDown" ||
                  (e.key === " " &&
                    !(e.target as HTMLElement).closest("button"));
                const backward = e.key === "ArrowUp" || e.key === "ArrowLeft";
                if (forward || backward) {
                  e.preventDefault();
                  e.stopPropagation();
                  reveal.onChange(
                    Math.max(
                      0,
                      Math.min(
                        reveal.count - 1,
                        reveal.step + (forward ? 1 : -1),
                      ),
                    ),
                  );
                }
              }}
              title="Open diagram fullscreen"
              disabled={!diagram}
              onClick={() => {
                setExpanded(true);
                if (
                  !document.fullscreenElement &&
                  document.documentElement.requestFullscreen
                ) {
                  ownsFullscreen.current = true;
                  void document.documentElement
                    .requestFullscreen()
                    .catch(() => {
                      ownsFullscreen.current = false;
                    });
                }
              }}
            >
              <Expand size={14} />
              <span>Fullscreen</span>
            </button>
          )}
          <button aria-label="Fit diagram" disabled={!diagram} onClick={fit}>
            <Scan size={14} />
            <span>Fit</span>
          </button>
        </div>
      </div>
    </div>
  );
  return expanded
    ? createPortal(
        <div
          className={`diagram-fullscreen theme-${theme}`}
          ref={fullscreenPanel}
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen diagram"
          onKeyDown={(e) => {
            if (
              !reveal ||
              e.shiftKey ||
              (e.target as HTMLElement).closest("input, textarea")
            )
              return;
            const forward =
              e.key === "ArrowRight" ||
              e.key === "ArrowDown" ||
              (e.key === " " && !(e.target as HTMLElement).closest("button"));
            const backward = e.key === "ArrowUp" || e.key === "ArrowLeft";
            if (forward || backward) {
              e.preventDefault();
              e.stopPropagation();
              reveal.onChange(
                Math.max(
                  0,
                  Math.min(reveal.count - 1, reveal.step + (forward ? 1 : -1)),
                ),
              );
            }
          }}
        >
          <header>
            <div>
              <strong>
                {reveal ? "Step-by-step flow" : "Mermaid diagram"}
              </strong>
              <span>Drag to pan · Scroll or pinch to zoom</span>
            </div>
            <button
              aria-label="Close fullscreen diagram"
              onClick={closeFullscreen}
            >
              <X size={20} />
              <span>Close</span>
            </button>
          </header>
          {panel}
        </div>,
        document.body,
      )
    : panel;
}
