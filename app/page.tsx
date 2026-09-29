"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Code2, FileJson, FolderOpen, Layers, Upload } from "lucide-react";
import type { Deck } from "@/lib/deck";
import { deckSchema, slideSchema } from "@/lib/slide-schema";
import { starterTemplates } from "@/lib/starter-templates";

function apiError(payload: { error?: { message?: string } }, fallback: string) {
  return payload.error?.message || fallback;
}

export default function CreateSlidePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [targetProject, setTargetProject] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (!id) return;
    fetch(`/api/projects/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(apiError(payload, "Could not load the project."));
        setTargetProject(payload.data.name);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load the project."));
  }, []);

  async function createDeck(deck: Deck) {
    const existingId = new URLSearchParams(window.location.search).get("project");
    if (existingId) {
      const response = await fetch(`/api/projects/${encodeURIComponent(existingId)}`);
      const project = await response.json();
      if (!response.ok) throw new Error(apiError(project, "Could not load the project."));
      if (project.data.slideCount !== 0)
        throw new Error("This project already has slides. Open it in the studio to add more.");
      const saved = await fetch(`/api/projects/${existingId}/deck`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...deck, name: project.data.name }),
      });
      const payload = await saved.json();
      if (!saved.ok) throw new Error(apiError(payload, "Could not save the slide."));
      window.location.assign(`/studio?project=${existingId}`);
      return;
    }
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deck.name, theme: deck.theme }),
    });
    const created = await response.json();
    if (!response.ok) throw new Error(apiError(created, "Could not create the project."));
    const projectId: string = created.data.id;
    try {
      const saved = await fetch(`/api/projects/${projectId}/deck`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deck),
      });
      const payload = await saved.json();
      if (!saved.ok) throw new Error(apiError(payload, "Could not save the slide."));
      window.location.assign(`/studio?project=${projectId}`);
    } catch (cause) {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" }).catch(() => {});
      throw cause;
    }
  }

  async function useTemplate(templateId: string) {
    const template = starterTemplates.find((item) => item.id === templateId);
    if (!template || creating) return;
    setError("");
    setCreating(templateId);
    try {
      await createDeck({
        name: `New ${template.name} slide`,
        theme: template.theme,
        slides: [{ ...template.slide }],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the slide.");
      setCreating(null);
    }
  }

  async function importJson(file?: File) {
    if (!file || creating) return;
    setError("");
    setCreating("import");
    try {
      const raw: unknown = JSON.parse(await file.text());
      const deckResult = deckSchema.safeParse(raw);
      if (deckResult.success) {
        await createDeck(deckResult.data);
        return;
      }
      const slideResult = slideSchema.safeParse(raw);
      if (slideResult.success) {
        await createDeck({
          name: slideResult.data.title.replace(/\s+/g, " ").slice(0, 160),
          theme: "editorial",
          slides: [slideResult.data],
        });
        return;
      }
      throw new Error("Choose a valid slide JSON or an exported deck JSON file.");
    } catch (cause) {
      setError(cause instanceof SyntaxError ? "This file is not valid JSON." : cause instanceof Error ? cause.message : "Could not import JSON.");
      setCreating(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="create-page">
      <header className="create-topbar">
        <a className="brand" href="/" aria-label="Folio home">
          <span className="brand-icon"><Layers size={20} /></span>
          folio<span className="brand-period">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="/library"><FolderOpen size={16} /> Slide library <ArrowRight size={16} /></a>
        </nav>
      </header>

      <main className="create-main">
        <section className="create-hero" aria-labelledby="create-title">
          <div>
            <span className="create-eyebrow"><span /> YOUR NEXT IDEA STARTS HERE</span>
            <h1 id="create-title">Create a new slide<span>.</span></h1>
            <p>Choose a starting point or bring your own JSON. Your slide is saved as a project, ready to edit here or update through the API and MCP server.</p>
            {targetProject && <p className="create-target">Adding the first slide to <strong>{targetProject}</strong>.</p>}
          </div>
          <div className="create-hero-card" aria-hidden="true">
            <span>01 / CREATE</span><span>02 / EDIT</span><span>03 / UPDATE ANYTIME</span>
            <div className="create-hero-line" />
            <strong>From first thought<br />to living slide.</strong>
          </div>
        </section>

        <section className="create-templates" aria-labelledby="template-heading">
          <div className="create-section-heading">
            <div><span className="create-step">01</span><h2 id="template-heading">Start with a template</h2></div>
            <p>Pick a look. Replace every word in the studio.</p>
          </div>
          <div className="create-template-grid">
            {starterTemplates.map((template) => (
              <button
                key={template.id}
                className="create-template-card"
                onClick={() => void useTemplate(template.id)}
                disabled={creating !== null}
                aria-label={`Create ${template.name} slide`}
              >
                <div className={`create-template-preview create-theme-${template.theme}`} aria-hidden="true">
                  <div className="create-preview-top"><span>✳ folio</span><span>{template.slide.eyebrow}</span></div>
                  <strong>{template.slide.title}</strong>
                  <span className="create-preview-number">01 / 01</span>
                </div>
                <div className="create-template-meta"><div><h3>{template.name}</h3><p>{template.description}</p></div><ArrowRight size={18} /></div>
              </button>
            ))}
          </div>
        </section>

        <section className="create-import" aria-labelledby="import-heading">
          <div className="create-section-heading">
            <div><span className="create-step">02</span><h2 id="import-heading">Or bring your JSON</h2></div>
            <p>Import one slide or a complete exported deck.</p>
          </div>
          <input
            ref={inputRef}
            className="create-file-input"
            type="file"
            accept=".json,application/json"
            aria-label="Upload slide or deck JSON"
            onChange={(event) => void importJson(event.target.files?.[0])}
          />
          <div
            className={`create-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); void importJson(event.dataTransfer.files[0]); }}
          >
            <div className="create-upload-icon"><Upload size={22} /></div>
            <div><h3>Drop a JSON file here</h3><p>Slide JSON and Folio deck exports are supported.</p></div>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={creating !== null}>
              <FileJson size={16} /> {creating === "import" ? "Importing…" : "Choose JSON file"}
            </button>
          </div>
          {error && <p className="create-error" role="alert">{error}</p>}
        </section>

        <aside className="create-integration">
          <div className="create-integration-icon"><Code2 size={21} /></div>
          <div><strong>Built for live updates</strong><p>Every new project has stable slide URLs. Connect an agent to <code>/api/mcp</code> or use the REST API to change saved slides; the open studio refreshes when they change.</p></div>
          <a href="/library">Browse saved slides <ArrowRight size={16} /></a>
        </aside>
      </main>
    </div>
  );
}
