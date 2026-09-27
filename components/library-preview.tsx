"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Database,
  FolderOpen,
  Plus,
  RefreshCw,
} from "lucide-react";
type Project = { id: string; name: string; theme: string; slideCount: number };
type SlideItem = {
  id: string;
  projectId: string;
  projectName: string;
  sourceId: string;
  title: string;
  layout: string;
  position: number;
};
export default function LibraryPreview({ full = false }: { full?: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/slides", { cache: "no-store" }),
      ]);
      const [projectsBody, slidesBody] = await Promise.all([
        p.json(),
        s.json(),
      ]);
      if (!p.ok || !s.ok)
        throw new Error(
          projectsBody.error?.message ||
            slidesBody.error?.message ||
            "Could not load slides.",
        );
      setProjects((current) => JSON.stringify(current) === JSON.stringify(projectsBody.data) ? current : projectsBody.data);
      setSlides((current) => JSON.stringify(current) === JSON.stringify(slidesBody.data) ? current : slidesBody.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load slides.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onRefresh = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(onRefresh, 2000);
    window.addEventListener("folio-library-change", refresh);
    window.addEventListener("focus", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("folio-library-change", refresh);
      window.removeEventListener("focus", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [refresh]);
  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), theme: "editorial" }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error?.message || "Could not create project.");
      setName("");
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create project.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className={`saved-library ${full ? "full" : ""}`}
      aria-labelledby="library-heading"
    >
      <div className="library-heading">
        <div>
          <span className="library-eyebrow">
            <Database size={14} /> POSTGRESQL LIBRARY
          </span>
          <h2 id="library-heading">
            Your saved slides<span>.</span>
          </h2>
          <p>Every slide has a home in a project and a link of its own.</p>
        </div>
        <div className="library-actions">
          <button
            aria-label="Refresh saved slides"
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} />
          </button>
          {!full && (
            <a href="/library">
              Open library <ArrowRight size={15} />
            </a>
          )}
        </div>
      </div>
      {full && (
        <form className="project-create" onSubmit={createProject}>
          <input
            aria-label="New project name"
            placeholder="Name a new project"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button disabled={saving || !name.trim()}>
            <Plus size={15} /> Create project
          </button>
        </form>
      )}
      {error ? (
        <div className="library-state" role="alert">
          {error}{" "}
          <span>
            Start PostgreSQL with <code>docker compose up -d postgres</code>.
          </span>
        </div>
      ) : loading ? (
        <div className="library-state">Loading saved slides…</div>
      ) : projects.length === 0 ? (
        <div className="library-state">
          <FolderOpen size={24} />
          <strong>No projects yet</strong>
          <span>
            Save a presentation from the editor, or create a project here.
          </span>
        </div>
      ) : (
        <div className="project-groups">
          {projects.map((p) => (
            <div className="project-group" key={p.id}>
              <div className="project-header">
                <div>
                  <FolderOpen size={17} />
                  <h3>{p.name}</h3>
                  <span>
                    {p.slideCount} {p.slideCount === 1 ? "slide" : "slides"}
                  </span>
                </div>
                <a href={`/?project=${p.id}`}>
                  Open in editor <ArrowRight size={14} />
                </a>
              </div>
              <div className="saved-slide-grid">
                {slides
                  .filter((s) => s.projectId === p.id)
                  .map((s) => (
                    <a
                      className="saved-slide-card"
                      href={`/library/projects/${p.id}/slides/${s.id}`}
                      key={s.id}
                    >
                      <span className="card-index">
                        {String(s.position + 1).padStart(2, "0")} · {s.layout}
                      </span>
                      <strong>{s.title.replace(/\n/g, " ")}</strong>
                      <span>
                        View & edit slide <ArrowRight size={13} />
                      </span>
                    </a>
                  ))}
                {p.slideCount === 0 && (
                  <div className="empty-project">
                    No slides yet. Open this project in the editor to add some.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
