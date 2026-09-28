"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Copy,
  Expand,
  FileJson,
  Grid2X2,
  Keyboard,
  Layers,
  LayoutTemplate,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Deck, Layout, Slide, Theme, parseDeck, sampleDeck } from "@/lib/deck";

import LibraryPreview from "@/components/library-preview";
import { deckSchema } from "@/lib/slide-schema";
import FlowChart from "@/components/flow-chart";
import CodeReveal from "@/components/code-reveal";
import { flowRevealSlide } from "@/lib/reveal-samples";
import MermaidDiagram from "@/components/mermaid-diagram";
import NativeChart from "@/components/native-chart";
import ChartEditor from "@/components/chart-editor";
import { chartTemplates } from "@/lib/chart-templates";

const themeNames = {
  editorial: "Editorial",
  midnight: "Midnight",
  botanical: "Botanical",
  "first-horizon": "First Horizon",
};
const layouts: Layout[] = [
  "cover",
  "statement",
  "metrics",
  "comparison",
  "quote",
  "closing",
  "diagram",
  "code",
  "flowchart",
];
function Artwork() {
  return (
    <div className="artwork" aria-hidden="true">
      <div className="art-orbit" />
      <div className="art-orange" />
      <div className="art-black" />
      <div className="art-cream" />
      <div className="art-dot" />
      <div className="art-line" />
      <span className="art-plus">+</span>
      <span className="art-caption">
        A WORLD OF
        <br />
        WHAT IF.
      </span>
    </div>
  );
}
export function SlideCanvas({
  slide,
  theme,
  index,
  total,
  mini = false,
  revealStep = 0,
  onReveal,
}: {
  slide: Slide;
  theme: Theme;
  index: number;
  total: number;
  mini?: boolean;
  revealStep?: number;
  onReveal?: (step: number) => void;
}) {
  const isFirstHorizon = theme === "first-horizon";
  const step = mini ? (slide.steps?.length || 1) - 1 : revealStep;
  return (
    <div
      className={`slide-canvas theme-${theme} layout-${slide.layout} ${mini ? "mini" : ""}`}
    >
      <div className="slide-top">
        <span>
          {isFirstHorizon ? (
            <img
              className="first-horizon-logo"
              src="/brands/first-horizon/logo.svg"
              alt="First Horizon"
              width={229}
              height={24}
            />
          ) : (
            <><span className="little-star">✳</span> possibility studio</>
          )}
        </span>
        <span>{slide.eyebrow}</span>
      </div>
      <div className="slide-content">
        <div className="slide-copy">
          {slide.layout === "quote" && <div className="quote-mark">“</div>}
          <h1>{slide.title}</h1>
          <p>{slide.description}</p>
          {slide.layout === "cover" && (
            <div className="slide-byline">
              <span className="short-rule" /> {isFirstHorizon ? "FIRSTHORIZON.COM" : "AN OPEN INVITATION TO THINK BIGGER"}{" "}
              <ArrowRight />
            </div>
          )}
          {slide.layout === "closing" && (
            <span className="closing-badge">
              {isFirstHorizon ? "Let’s move forward together" : "The beginning of something good"} <ArrowRight />
            </span>
          )}
        </div>
        {slide.layout === "chart" && slide.chart && <NativeChart chart={slide.chart} theme={theme} mini={mini} />}
        {slide.layout === "diagram" && (
          <MermaidDiagram
            source={slide.steps?.[step]?.mermaid || slide.mermaid || ""}
            reveal={
              !mini && slide.steps && onReveal
                ? {
                    step,
                    count: slide.steps.length,
                    label: slide.steps[step]?.label || "",
                    onChange: onReveal,
                  }
                : undefined
            }
            theme={theme}
            mini={mini}
          />
        )}
        {slide.layout === "flowchart" && slide.flow && (
          <FlowChart
            flow={slide.flow}
            theme={theme}
            mini={mini}
            reveal={{
              step,
              count: slide.steps?.length || 1,
              label: slide.steps?.[step]?.label || "",
              onChange: onReveal || (() => {}),
            }}
          />
        )}
        {slide.layout === "code" && (
          <CodeReveal
            slide={slide}
            step={step}
            onChange={onReveal}
            mini={mini}
          />
        )}
        {(slide.layout === "cover" || slide.layout === "closing") && (
          isFirstHorizon ? (
            <div className="horizon-art" aria-hidden="true"><span /><i /></div>
          ) : <Artwork />
        )}
        {slide.layout === "statement" && !isFirstHorizon && (
          <div className="statement-art">
            <span>?</span>
            <span>!</span>
            <i>STAY CURIOUS.</i>
          </div>
        )}
        {(slide.layout === "metrics" || slide.layout === "comparison") && (
          <div className="slide-items">
            {slide.items?.map((item, i) => (
              <div className="slide-item" key={i}>
                <strong>{item.value}</strong>
                <h3>{item.label}</h3>
                {item.detail && <p>{item.detail}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="slide-bottom">
        <span>{isFirstHorizon ? "FIRST HORIZON  /  FIRSTHORIZON.COM" : "IDEAS INTO POSSIBILITIES"}</span>
        <span>
          {String(index + 1).padStart(2, "0")} <i>/</i>{" "}
          {String(total).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
export default function Studio() {
  const [deck, setDeck] = useState<Deck>(sampleDeck);
  const [active, setActive] = useState(0);
  const [reveal, setReveal] = useState({ id: "", step: 0 });
  const [tab, setTab] = useState("design");
  const [modal, setModal] = useState<
    "json" | "add" | "shortcuts" | "save" | null
  >(null);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [linkedProject, setLinkedProject] = useState<string | null>(null);
  const [remoteDeck, setRemoteDeck] = useState<{ deck: Deck; etag: string } | null>(null);
  const deckRef = useRef(deck);
  const baselineRef = useRef<string | null>(null);
  const etagRef = useRef<string | null>(null);
  deckRef.current = deck;
  const [projectOptions, setProjectOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [projectTarget, setProjectTarget] = useState("new");
  const [projectName, setProjectName] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [transition, setTransition] = useState("slide");
  const [notesOpen, setNotesOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [overview, setOverview] = useState(false);
  const [direction, setDirection] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const slide = deck.slides[Math.min(active, deck.slides.length - 1)];
  const revealStep =
    reveal.id === slide.id
      ? Math.min(reveal.step, (slide.steps?.length || 1) - 1)
      : 0;
  const changeReveal = (step: number) =>
    setReveal({
      id: slide.id,
      step: Math.max(0, Math.min(step, (slide.steps?.length || 1) - 1)),
    });
  useEffect(() => {
    setReveal({ id: "", step: 0 });
  }, [active]);
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    void (async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!cancelled) window.print();
    })();
    const afterPrint = () => setPrinting(false);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [printing]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("folio-deck");
      if (stored) {
        const parsed = parseDeck(stored);
        const previousSample = {
          ...sampleDeck,
          slides: sampleDeck.slides.filter(
            (s) =>
              s.layout !== "diagram" &&
              s.layout !== "code" &&
              s.layout !== "flowchart",
          ),
        };
        setDeck(
          JSON.stringify(parsed) === JSON.stringify(previousSample) ||
            JSON.stringify(parsed) ===
              JSON.stringify({
                ...sampleDeck,
                slides: sampleDeck.slides.filter((s) => !s.steps),
              })
            ? sampleDeck
            : parsed,
        );
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const id = new URLSearchParams(window.location.search).get("project");
    if (!id) return;
    fetch(`/api/projects/${id}/deck`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok)
          throw new Error(payload.error?.message || "Could not load project.");
        const loaded = parseDeck(JSON.stringify(payload.data));
        baselineRef.current = JSON.stringify(loaded);
        etagRef.current = res.headers.get("etag");
        setDeck(loaded);
        setLinkedProject(id);
        setActive(0);
      })
      .catch((err) =>
        setToast(
          err instanceof Error ? err.message : "Could not load project.",
        ),
      );
  }, [ready]);
  useEffect(() => {
    if (!linkedProject) return;
    let stopped = false;
    let inFlight = false;
    async function refresh() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/projects/${linkedProject}/deck`, {
          cache: "no-store",
          headers: etagRef.current ? { "If-None-Match": etagRef.current } : {},
        });
        if (res.status === 304 || stopped) return;
        if (!res.ok) throw new Error("Could not refresh project.");
        const payload = await res.json();
        if (stopped) return;
        const incoming = parseDeck(JSON.stringify(payload.data));
        const etag = res.headers.get("etag") || "";
        if (JSON.stringify(incoming) === baselineRef.current) {
          etagRef.current = etag;
          return;
        }
        if (JSON.stringify(deckRef.current) === baselineRef.current) {
          const currentId = deckRef.current.slides[active]?.id;
          setDeck(incoming);
          setActive(currentId ? Math.max(0, incoming.slides.findIndex((s) => s.id === currentId)) : 0);
          baselineRef.current = JSON.stringify(incoming);
          etagRef.current = etag;
          setRemoteDeck(null);
        } else {
          setRemoteDeck({ deck: incoming, etag });
        }
      } catch {
        // Keep the current draft during a temporary network interruption.
      } finally {
        inFlight = false;
      }
    }
    const timer = window.setInterval(() => void refresh(), 2000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [linkedProject, active]);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("folio-deck", JSON.stringify(deck));
        setSaved(true);
      } catch {
        setSaved(false);
      }
    }
  }, [deck, ready]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const navigate = useCallback(
    (step: number) => {
      const count = slide.steps?.length || 1;
      if (step > 0 && revealStep < count - 1) {
        setReveal({ id: slide.id, step: revealStep + 1 });
        return;
      }
      if (step < 0 && revealStep > 0) {
        setReveal({ id: slide.id, step: revealStep - 1 });
        return;
      }
      setDirection(step);
      setActive((a) => Math.max(0, Math.min(deck.slides.length - 1, a + step)));
    },
    [deck.slides.length, slide, revealStep],
  );
  const exit = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement)
      void document.exitFullscreen().catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.querySelector(".diagram-fullscreen")) return;
      if (
        (e.target as HTMLElement).closest(
          "input, textarea, select, [contenteditable=true]",
        ) ||
        modal
      )
        return;
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        (presenting && e.key === " ")
      ) {
        e.preventDefault();
        navigate(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate(-1);
      }
      if (e.key === "Escape") {
        exit();
        setOverview(false);
      }
      if (e.key === "Home") setActive(0);
      if (e.key === "End") setActive(deck.slides.length - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, modal, presenting, exit, deck.slides.length, slide]);
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>(".modal");
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = focusable();
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [modal]);
  function updateSlide(values: Partial<Slide>) {
    setDeck((d) => ({
      ...d,
      slides: d.slides.map((s, i) => (i === active ? { ...s, ...values } : s)),
    }));
  }
  function openJson() {
    setJson(JSON.stringify(deck, null, 2));
    setError("");
    setModal("json");
  }
  async function openSave() {
    setError("");
    setProjectName(deck.name);
    setProjectTarget(linkedProject || "new");
    setModal("save");
    try {
      const response = await fetch("/api/projects");
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error?.message || "Could not load projects.");
      setProjectOptions(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects.");
    }
  }
  async function saveProject() {
    setError("");
    const deckToSave = { ...deck, name: projectName.trim() };
    const parsed = deckSchema.safeParse(deckToSave);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
      return;
    }
    setSavingProject(true);
    try {
      let id = projectTarget;
      if (id === "new") {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectName, theme: deck.theme }),
        });
        const payload = await response.json();
        if (!response.ok)
          throw new Error(
            payload.error?.issues
              ?.map(
                (i: { path: string; message: string }) =>
                  `${i.path}: ${i.message}`,
              )
              .join("; ") ||
              payload.error?.message ||
              "Could not create project.",
          );
        id = payload.data.id;
      }
      const response = await fetch(`/api/projects/${id}/deck`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(id === linkedProject && etagRef.current ? { "If-Match": etagRef.current } : {}),
        },
        body: JSON.stringify({
          ...parsed.data,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error?.issues
            ?.map(
              (i: { path: string; message: string }) =>
                `${i.path}: ${i.message}`,
            )
            .join("; ") ||
            payload.error?.message ||
            "Could not save deck.",
        );
      setLinkedProject(id);
      baselineRef.current = JSON.stringify(deckToSave);
      etagRef.current = response.headers.get("etag");
      setRemoteDeck(null);
      setDeck(deckToSave);
      window.history.replaceState({}, "", `/?project=${id}`);
      setModal(null);
      setToast(`${payload.data.savedSlides} slides saved to PostgreSQL`);
      window.dispatchEvent(new Event("folio-library-change"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project.");
    } finally {
      setSavingProject(false);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Your deck has been exported");
  }
  function moveSlide(offset: number) {
    const target = active + offset;
    if (target < 0 || target >= deck.slides.length) return;
    setDeck((current) => {
      const slides = [...current.slides];
      [slides[active], slides[target]] = [slides[target], slides[active]];
      return { ...current, slides };
    });
    setActive(target);
    setToast(`Slide moved to position ${target + 1}`);
  }
  function downloadNotes() {
    const text = [
      deck.name,
      "=".repeat(40),
      ...deck.slides.map((s, i) =>
        `\n${i + 1}. ${s.title.replace(/\n/g, " ")}\n${s.notes.trim() || "(No speaker notes)"}`,
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${deck.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-notes.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Speaker notes exported in slide order");
  }
  async function present() {
    setPresenting(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* Presentation mode also works without browser fullscreen. */
    }
  }
  function addSlide(layout: Layout, template?: Slide) {
    const source = template || sampleDeck.slides.find((s) => s.layout === layout)!;
    const newSlide = { ...structuredClone(source), id: crypto.randomUUID() };
    setDeck((d) => ({
      ...d,
      slides: [
        ...d.slides.slice(0, active + 1),
        newSlide,
        ...d.slides.slice(active + 1),
      ],
    }));
    setActive(active + 1);
    setModal(null);
    setToast("A new possibility, added");
  }
  const animatedSlide = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        className="animated-slide"
        key={`${slide.id}-${deck.theme}`}
        initial={{
          opacity: transition === "none" ? 1 : 0,
          x: !reduce && transition === "slide" ? direction * 35 : 0,
          scale: !reduce && transition === "zoom" ? 0.94 : 1,
        }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{
          opacity: transition === "none" ? 1 : 0,
          x: !reduce && transition === "slide" ? direction * -25 : 0,
        }}
        transition={{ duration: reduce || transition === "none" ? 0 : 0.28 }}
      >
        <SlideCanvas
          slide={slide}
          theme={deck.theme}
          index={active}
          total={deck.slides.length}
          revealStep={revealStep}
          onReveal={changeReveal}
        />
      </motion.div>
    </AnimatePresence>
  );
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Folio home">
          <span className="brand-icon">
            <Layers size={20} />
          </span>
          folio<span className="brand-period">.</span>
        </a>
        <div className="header-divider" />
        <div className="workspace-label">
          Your workspace <ChevronDown size={13} />
        </div>
        <div className="topbar-center">
          <span className="draft-dot" /> Personal workspace
        </div>
        <a className="top-library-link" href="/library">
          Slide library
        </a>
        <button
          className="avatar"
          title="Personal workspace"
          onClick={() =>
            setToast("Your personal workspace · saved on this device")
          }
        >
          JD
        </button>
      </header>
      <div className="document-bar">
        <div className="document-info">
          <span className="document-icon">
            <FileJson size={19} />
          </span>
          <div>
            <input
              aria-label="Presentation name"
              value={deck.name}
              onChange={(e) => setDeck({ ...deck, name: e.target.value })}
            />
            <span className="save-status">
              <Check size={11} />{" "}
              {saved
                ? "All changes saved locally"
                : "Storage full · export to save"}
            </span>
          </div>
          <span className="deck-tag">Sample deck</span>
        </div>
        <div className="document-actions">
          <button
            className="button save-db-button"
            onClick={() => void openSave()}
          >
            <Database size={15} />
            <span>{linkedProject ? "Save changes" : "Save to project"}</span>
          </button>
          <button className="button quiet" onClick={openJson}>
            <Code2 size={16} />
            <span>Edit JSON</span>
          </button>
          <div className="export-menu-wrap">
            <button className="button export-button" aria-expanded={exportMenuOpen} onClick={() => setExportMenuOpen(!exportMenuOpen)}>
              <ArrowDownToLine size={15} />
              <span>Export</span>
              <ChevronDown size={13} />
            </button>
            {exportMenuOpen && <div className="export-menu" role="menu">
              <button role="menuitem" onClick={() => { setExportMenuOpen(false); setPrinting(true); }}>Export as PDF</button>
              <button role="menuitem" onClick={() => { setExportMenuOpen(false); download(); }}>Export as JSON</button>
            </div>}
          </div>
          <button className="button primary" onClick={present}>
            <Play size={15} fill="currentColor" />
            Present
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
      {remoteDeck && (
        <div className="live-update-banner" role="status">
          This project changed elsewhere. Your unsaved edits are safe.
          <button onClick={() => {
            const currentId = deck.slides[active]?.id;
            setDeck(remoteDeck.deck);
            setActive(currentId ? Math.max(0, remoteDeck.deck.slides.findIndex((s) => s.id === currentId)) : 0);
            baselineRef.current = JSON.stringify(remoteDeck.deck);
            etagRef.current = remoteDeck.etag;
            setRemoteDeck(null);
          }}>Load latest</button>
        </div>
      )}
      <div className="studio-layout">
        <aside className="filmstrip">
          <div className="panel-heading">
            <span>
              Slides <b>{deck.slides.length}</b>
            </span>
            <button
              className={`icon-button ${overview ? "selected" : ""}`}
              aria-label="Toggle slide overview"
              onClick={() => setOverview(!overview)}
            >
              <Grid2X2 size={16} />
            </button>
          </div>
          <div className="thumbnail-list">
            {deck.slides.map((s, i) => (
              <button
                className={`thumbnail-row ${active === i ? "active" : ""}`}
                key={s.id}
                onClick={() => {
                  setDirection(i > active ? 1 : -1);
                  setActive(i);
                }}
                aria-label={`Slide ${i + 1}: ${s.title.replace(/\n/g, " ")}`}
                aria-current={active === i ? "true" : undefined}
              >
                <span className="thumbnail-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="thumbnail-wrapper">
                  <div className="thumbnail">
                    <SlideCanvas
                      mini
                      slide={s}
                      theme={deck.theme}
                      index={i}
                      total={deck.slides.length}
                    />
                  </div>
                  <div className="thumbnail-label">
                    {s.layout.charAt(0).toUpperCase() + s.layout.slice(1)}
                    {active === i && <span />}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button className="add-slide" onClick={() => setModal("add")}>
            <Plus size={16} /> Add slide
          </button>
          <div className="sidebar-foot">
            <span className="tiny-logo">✳</span>A little structure. Endless
            possibility.
          </div>
        </aside>
        <main className="workspace">
          <div className="canvas-toolbar">
            <div className="breadcrumb">
              Your presentation <ChevronRight size={12} />
              <strong>Slide {String(active + 1).padStart(2, "0")}</strong>
            </div>
            <div className="toolbar-right">
              <button className="icon-button" aria-label="Move slide earlier" title="Move slide earlier" disabled={active === 0} onClick={() => moveSlide(-1)}>
                <ArrowUp size={15} />
              </button>
              <button className="icon-button" aria-label="Move slide later" title="Move slide later" disabled={active === deck.slides.length - 1} onClick={() => moveSlide(1)}>
                <ArrowDown size={15} />
              </button>
              <span className="aspect-badge">16:9</span>
              <span className="toolbar-rule" />
              <button
                className="icon-button"
                title="Present fullscreen"
                aria-label="Present fullscreen"
                onClick={present}
              >
                <Expand size={15} />
              </button>
              <button
                className="icon-button"
                title="Duplicate slide"
                aria-label="Duplicate slide"
                onClick={() => {
                  const copy = {
                    ...structuredClone(slide),
                    id: crypto.randomUUID(),
                  };
                  setDeck((d) => ({
                    ...d,
                    slides: [
                      ...d.slides.slice(0, active + 1),
                      copy,
                      ...d.slides.slice(active + 1),
                    ],
                  }));
                  setActive(active + 1);
                  setToast("Slide duplicated");
                }}
              >
                <Copy size={15} />
              </button>
            </div>
          </div>
          <div className={`canvas-area ${overview ? "is-overview" : ""}`}>
            {overview ? (
              <div className="overview-grid">
                {deck.slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActive(i);
                      setOverview(false);
                    }}
                  >
                    <SlideCanvas
                      mini
                      slide={s}
                      theme={deck.theme}
                      index={i}
                      total={deck.slides.length}
                    />
                    <span>
                      {i + 1} · {s.layout}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="canvas-frame">{animatedSlide}</div>
            )}
          </div>
          <div className="canvas-controls">
            <div className="canvas-status">
              <span /> {themeNames[deck.theme]} template
            </div>
            <div className="slide-navigation">
              <button
                className="icon-button"
                aria-label="Previous slide"
                disabled={active === 0 && revealStep === 0}
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span>
                <strong>{String(active + 1).padStart(2, "0")}</strong> /{" "}
                {String(deck.slides.length).padStart(2, "0")}
              </span>
              <button
                className="icon-button"
                aria-label="Next slide"
                disabled={
                  active === deck.slides.length - 1 &&
                  revealStep === (slide.steps?.length || 1) - 1
                }
                onClick={() => navigate(1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              className="keyboard-hint"
              onClick={() => setModal("shortcuts")}
            >
              <Keyboard size={14} />
              <span>Navigate with</span>
              <kbd>←</kbd>
              <kbd>→</kbd>
            </button>
          </div>
          <div className="notes-panel">
            <button
              className="notes-heading"
              onClick={() => setNotesOpen(!notesOpen)}
            >
              <StickyNote size={15} />
              <span>Speaker notes</span>
              <ChevronDown
                size={14}
                style={{ transform: notesOpen ? "" : "rotate(-90deg)" }}
              />
            </button>
            {notesOpen && (
              <textarea
                aria-label="Speaker notes"
                value={slide.notes}
                onChange={(e) => updateSlide({ notes: e.target.value })}
                placeholder="Add a thought, a reminder, a little inspiration…"
              />
            )}
            <button className="button notes-export" onClick={downloadNotes}>
              <ArrowDownToLine size={14} /> Export all speaker notes
            </button>
            <span className="notes-private">
              Just for you. Not visible while presenting.
            </span>
          </div>
          <footer className="workspace-footer">
            <span>
              <span className="orange-spark">✳</span> Made for your next big
              idea.
            </span>
            <span>Built with structure. Presented with soul.</span>
          </footer>
        </main>
        <aside className="inspector">
          <div className="inspector-tabs">
            <button
              className={tab === "design" ? "active" : ""}
              onClick={() => setTab("design")}
            >
              <LayoutTemplate size={14} /> Design
            </button>
            <button
              className={tab === "content" ? "active" : ""}
              onClick={() => setTab("content")}
            >
              <Layers size={14} /> Content
            </button>
          </div>
          {tab === "design" ? (
            <>
              <section className="inspector-section">
                <div className="section-title">
                  Make it yours <Sparkles size={14} />
                </div>
                <p className="section-description">
                  Same story. A different feeling.
                </p>
                <div className="theme-list">
                  {(Object.keys(themeNames) as Theme[]).map((t) => (
                    <button
                      className={`theme-option ${deck.theme === t ? "active" : ""}`}
                      key={t}
                      aria-label={themeNames[t]}
                      onClick={() => setDeck({ ...deck, theme: t })}
                    >
                      <div className={`theme-swatch swatch-${t}`}>
                        <span>Aa</span>
                        <i />
                        <i />
                        <i />
                      </div>
                      <div className="theme-label">
                        <span>{themeNames[t]}</span>
                        {deck.theme === t ? (
                          <span className="theme-check">
                            <Check size={10} />
                          </span>
                        ) : (
                          <span className="theme-radio" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {deck.theme === "first-horizon" && (
                  <p className="section-description">
                    <a href="/first-horizon-deck.json" download>Download First Horizon starter deck</a>
                    <br />Import it to start a new presentation.
                  </p>
                )}
              </section>
              <section className="inspector-section">
                <div className="section-title">
                  Slide transition <span className="motion-label">MOTION</span>
                </div>
                <p className="section-description">
                  A smooth move to your next idea.
                </p>
                <select
                  aria-label="Slide transition"
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                >
                  <option value="slide">Slide & fade</option>
                  <option value="fade">Soft fade</option>
                  <option value="zoom">Gentle zoom</option>
                  <option value="none">No animation</option>
                </select>
                <div className="transition-detail">
                  <span>Duration</span>
                  <span>
                    {transition === "none" ? "0" : "0.28"}s{" "}
                    <span className="muted">· Ease out</span>
                  </span>
                </div>
              </section>
              <section className="inspector-section slide-layout-info">
                <div className="section-title">
                  Layout <span className="layout-type">{slide.layout}</span>
                </div>
                <div className="layout-preview">
                  <div />
                  <div />
                  <div />
                </div>
                <p className="section-description">
                  Thoughtfully arranged.
                  <br />
                  Ready for your content.
                </p>
              </section>
              <div className="json-callout">
                <div>
                  <Code2 size={17} />
                  <span>Ideas in. Slides out.</span>
                </div>
                <p>Your presentation, powered by a simple JSON structure.</p>
                <button onClick={openJson}>
                  Explore the JSON <ArrowRight size={13} />
                </button>
              </div>
            </>
          ) : (
            <section className="inspector-section content-form">
              <div className="section-title">The words that matter</div>
              <label>
                Eyebrow
                <input
                  value={slide.eyebrow}
                  onChange={(e) => updateSlide({ eyebrow: e.target.value })}
                />
              </label>
              <label>
                Title
                <textarea
                  rows={4}
                  value={slide.title}
                  onChange={(e) => updateSlide({ title: e.target.value })}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  value={slide.description}
                  onChange={(e) => updateSlide({ description: e.target.value })}
                />
              </label>
              {slide.layout === "chart" && slide.chart && <ChartEditor key={slide.id} chart={slide.chart} onChange={(chart) => updateSlide({ chart })} />}
              {slide.layout === "diagram" && !slide.steps && (
                <label>
                  Mermaid source
                  <textarea
                    className="mermaid-source"
                    aria-label="Mermaid source"
                    rows={18}
                    spellCheck={false}
                    value={slide.mermaid || ""}
                    onChange={(e) => updateSlide({ mermaid: e.target.value })}
                  />
                  <span className="section-description">
                    Updates as you type. Drag the diagram to pan; scroll, pinch,
                    or use + / − to zoom.
                  </span>
                </label>
              )}
              {slide.steps && (
                <>
                  <div className="section-description">
                    Reveal steps · {revealStep + 1} / {slide.steps.length}. Use
                    Edit JSON to add or reorder steps.
                  </div>
                  <label>
                    Step label
                    <input
                      value={slide.steps[revealStep]?.label || ""}
                      onChange={(e) =>
                        updateSlide({
                          steps: slide.steps!.map((s, i) =>
                            i === revealStep
                              ? { ...s, label: e.target.value }
                              : s,
                          ),
                        })
                      }
                    />
                  </label>
                  {slide.layout !== "flowchart" && (
                    <label>
                      Step source
                      <textarea
                        aria-label="Step source"
                        rows={14}
                        className="mermaid-source"
                        value={
                          slide.steps[revealStep]?.[
                            slide.layout === "code" ? "code" : "mermaid"
                          ] || ""
                        }
                        onChange={(e) =>
                          updateSlide({
                            steps: slide.steps!.map((s, i) =>
                              i === revealStep
                                ? {
                                    ...s,
                                    [slide.layout === "code"
                                      ? "code"
                                      : "mermaid"]: e.target.value,
                                  }
                                : s,
                            ),
                          })
                        }
                      />
                    </label>
                  )}
                </>
              )}
              {slide.layout === "flowchart" && slide.flow && (
                <>
                  <p className="section-description">
                    React Flow · Edit nodes below. Use Edit JSON to change
                    positions, connections, or reveal steps.
                  </p>
                  {slide.flow.nodes.map((node) => (
                    <label key={node.id}>
                      Node · {node.id}
                      <input
                        value={node.label}
                        onChange={(e) =>
                          updateSlide({
                            flow: {
                              ...slide.flow!,
                              nodes: slide.flow!.nodes.map((n) =>
                                n.id === node.id
                                  ? { ...n, label: e.target.value }
                                  : n,
                              ),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </>
              )}
              {slide.items?.map((item, i) => (
                <label key={i}>
                  Item {i + 1}
                  <input
                    aria-label={`Item ${i + 1} value`}
                    value={item.value}
                    onChange={(e) =>
                      updateSlide({
                        items: slide.items!.map((v, j) =>
                          j === i ? { ...v, value: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <textarea
                    aria-label={`Item ${i + 1} label`}
                    value={item.label}
                    onChange={(e) =>
                      updateSlide({
                        items: slide.items!.map((v, j) =>
                          j === i ? { ...v, label: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                className="button danger"
                disabled={deck.slides.length === 1}
                onClick={() => {
                  setDeck((d) => ({
                    ...d,
                    slides: d.slides.filter((_, i) => i !== active),
                  }));
                  setActive(Math.max(0, active - 1));
                }}
              >
                <Trash2 size={14} /> Delete slide
              </button>
            </section>
          )}
          <div className="inspector-bottom">
            <span className="online-dot" /> A canvas for every possibility
          </div>
        </aside>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              const text = await file.text();
              parseDeck(text);
              setJson(text);
              setError("");
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Could not read file",
              );
            }
          }
          e.target.value = "";
        }}
      />
      <AnimatePresence>
        {modal && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className={`modal ${modal === "json" ? "json-modal" : ""}`}
              initial={{ y: 15 }}
              animate={{ y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <span className="eyebrow">YOUR NEXT POSSIBILITY</span>
                  <h2 id="modal-title">
                    {modal === "json"
                      ? "A little structure. A great story."
                      : modal === "add"
                        ? "Make room for a new idea."
                        : modal === "save"
                          ? "Save your slides to a project."
                          : "Keep your story moving."}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close dialog"
                  onClick={() => setModal(null)}
                >
                  <X size={20} />
                </button>
              </div>
              {modal === "json" ? (
                <>
                  <p>
                    Edit your deck below, or import a JSON file. Apply it to
                    bring your slides to life.
                  </p>
                  <div className="json-tools">
                    <span>
                      <FileJson size={14} /> presentation.json
                    </span>
                    <button
                      className="button quiet"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={14} /> Import JSON
                    </button>
                    <button
                      className="button quiet"
                      onClick={() =>
                        setJson(JSON.stringify(sampleDeck, null, 2))
                      }
                    >
                      <RotateCcw size={13} /> Sample
                    </button>
                  </div>
                  <textarea
                    className="json-editor"
                    aria-label="Deck JSON"
                    spellCheck={false}
                    value={json}
                    onChange={(e) => setJson(e.target.value)}
                  />
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="modal-footer">
                    <span>10 layouts · 4 themes · Endless possibilities</span>
                    <button
                      className="button primary"
                      onClick={() => {
                        try {
                          const next = parseDeck(json);
                          setDeck(next);
                          setActive(0);
                          setModal(null);
                          setToast("Your ideas are ready to present");
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Invalid JSON",
                          );
                        }
                      }}
                    >
                      Apply changes <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              ) : modal === "save" ? (
                <div className="save-project-form">
                  <p>
                    Slides are stored in PostgreSQL and get individual links in
                    your library.
                  </p>
                  <label>
                    Project
                    <select
                      aria-label="Choose project"
                      value={projectTarget}
                      onChange={(e) => {
                        setProjectTarget(e.target.value);
                        setProjectName(
                          e.target.value === "new"
                            ? deck.name
                            : projectOptions.find(
                                (p) => p.id === e.target.value,
                              )?.name || deck.name,
                        );
                      }}
                    >
                      <option value="new">Create a new project</option>
                      {projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {projectTarget === "new" && (
                    <label>
                      Project name
                      <input
                        aria-label="Project name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                      />
                    </label>
                  )}
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="modal-footer">
                    <span>
                      All {deck.slides.length} slides will be saved together.
                    </span>
                    <button
                      className="button primary"
                      disabled={
                        savingProject ||
                        (projectTarget === "new" && !projectName.trim())
                      }
                      onClick={() => void saveProject()}
                    >
                      {savingProject ? "Saving…" : "Save slides"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              ) : modal === "add" ? (
                <>
                  <p>Pick a starting point. Your content makes it yours.</p>
                  <h3>Charts</h3>
                  <div className="chart-options">
                    {chartTemplates.map(({ name, slide: template }) => (
                      <button key={name} onClick={() => addSlide("chart", template)}>
                        <strong>{name}<Plus size={14} /></strong>
                        <span>{template.description}</span>
                      </button>
                    ))}
                  </div>
                  <h3>Slide layouts</h3>
                  <button
                    className="button primary"
                    onClick={() => {
                      const copy = {
                        ...structuredClone(flowRevealSlide),
                        id: crypto.randomUUID(),
                      };
                      setDeck((d) => ({
                        ...d,
                        slides: [
                          ...d.slides.slice(0, active + 1),
                          copy,
                          ...d.slides.slice(active + 1),
                        ],
                      }));
                      setActive(active + 1);
                      setModal(null);
                    }}
                  >
                    Add GitHub Actions step-by-step flow
                  </button>
                  <div className="layout-options">
                    {layouts.map((l) => (
                      <button
                        key={l}
                        aria-label={l}
                        onClick={() => addSlide(l)}
                      >
                        <div className="layout-option-preview">
                          <SlideCanvas
                            slide={sampleDeck.slides.find(
                              (s) => s.layout === l,
                            )!}
                            theme={deck.theme}
                            index={0}
                            total={1}
                            mini
                          />
                        </div>
                        <span>
                          {l}
                          <Plus size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="shortcut-list">
                  <div>
                    Next slide <kbd>→ / ↓ / Space</kbd>
                  </div>
                  <div>
                    Previous slide <kbd>← / ↑</kbd>
                  </div>
                  <div>
                    First / last slide <kbd>Home / End</kbd>
                  </div>
                  <div>
                    Exit presentation <kbd>Esc</kbd>
                  </div>
                  <p>
                    Next reveals all steps before advancing slides. On the
                    GitHub flow, Right reveals; Left goes back. Click the flow
                    or code to reveal. Shift + arrows pan diagrams.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {presenting && (
        <div className="presentation-mode">
          <div className="presentation-canvas">{animatedSlide}</div>
          <div className="presentation-controls">
            <button
              className="icon-button"
              aria-label="Exit presentation"
              onClick={exit}
            >
              <X size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Previous presentation slide"
              disabled={active === 0 && revealStep === 0}
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={18} />
            </button>
            <span>
              {active + 1} / {deck.slides.length}
            </span>
            <button
              className="icon-button"
              aria-label="Next presentation slide"
              disabled={
                active === deck.slides.length - 1 &&
                revealStep === (slide.steps?.length || 1) - 1
              }
              onClick={() => navigate(1)}
            >
              <ArrowRight size={18} />
            </button>
            <span className="present-escape">Esc to exit</span>
          </div>
        </div>
      )}
      <div className="print-deck" aria-hidden="true">
        {deck.slides.map((printSlide, i) => (
          <div className="print-slide" key={printSlide.id}>
            <SlideCanvas slide={printSlide} theme={deck.theme} index={i} total={deck.slides.length} />
          </div>
        ))}
      </div>
      <LibraryPreview />
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Check size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
