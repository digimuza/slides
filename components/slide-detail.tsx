"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, FileJson, Trash2 } from "lucide-react";
import { slideSchema, type ValidSlide } from "@/lib/slide-schema";
import { SlideCanvas } from "@/app/studio/page";
import type { Theme } from "@/lib/deck";
type RecordItem = {
  id: string;
  projectId: string;
  title: string;
  layout: string;
  content: ValidSlide;
  updatedAt: string;
};
export default function SlideDetail({
  projectId,
  slideId,
}: {
  projectId: string;
  slideId: string;
}) {
  const [record, setRecord] = useState<RecordItem | null>(null);
  const [project, setProject] = useState<{ name: string; theme: Theme } | null>(
    null,
  );
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [remote, setRemote] = useState<{ record: RecordItem; etag: string } | null>(null);
  const savedJsonRef = useRef("");
  const jsonRef = useRef("");
  const etagRef = useRef<string | null>(null);
  jsonRef.current = json;
  useEffect(() => {
    Promise.all([
      fetch(`/api/slides/${slideId}`),
      fetch(`/api/projects/${projectId}`),
    ])
      .then(async ([s, p]) => {
        const [a, b] = await Promise.all([s.json(), p.json()]);
        if (!s.ok || !p.ok)
          throw new Error(
            a.error?.message || b.error?.message || "Slide unavailable.",
          );
        setRecord(a.data);
        setProject(b.data);
        const source = JSON.stringify(a.data.content, null, 2);
        savedJsonRef.current = source;
        etagRef.current = s.headers.get("etag");
        setJson(source);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Slide unavailable."),
      )
      .finally(() => setLoading(false));
  }, [slideId, projectId]);
  useEffect(() => {
    if (loading || !record) return;
    let stopped = false;
    let inFlight = false;
    async function refresh() {
      if (stopped || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/slides/${slideId}`, {
          cache: "no-store",
          headers: etagRef.current ? { "If-None-Match": etagRef.current } : {},
        });
        if (res.status === 304 || stopped) return;
        if (res.status === 404) {
          setError("This slide was deleted elsewhere.");
          return;
        }
        if (!res.ok) return;
        const payload = await res.json();
        if (stopped) return;
        const incoming = payload.data as RecordItem;
        const source = JSON.stringify(incoming.content, null, 2);
        const etag = res.headers.get("etag") || "";
        if (source === savedJsonRef.current) {
          etagRef.current = etag;
          return;
        }
        if (jsonRef.current === savedJsonRef.current) {
          setRecord(incoming);
          setJson(source);
          savedJsonRef.current = source;
          etagRef.current = etag;
          setRemote(null);
          setSaved(false);
        } else {
          setRemote({ record: incoming, etag });
        }
      } catch {
        // A later poll retries without disturbing the draft.
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
  }, [loading, record?.id, slideId]);
  const parsed = (() => {
    try {
      return slideSchema.safeParse(JSON.parse(json));
    } catch {
      return null;
    }
  })();
  async function save() {
    setSaved(false);
    setError("");
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      setError("JSON syntax is invalid.");
      return;
    }
    const res = await fetch(`/api/slides/${slideId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(etagRef.current ? { "If-Match": etagRef.current } : {}) },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(
        payload.error?.issues
          ?.map(
            (i: { path: string; message: string }) => `${i.path}: ${i.message}`,
          )
          .join("\n") ||
          payload.error?.message ||
          "Could not save slide.",
      );
      return;
    }
    setRecord(payload.data);
    const source = JSON.stringify(payload.data.content, null, 2);
    savedJsonRef.current = source;
    etagRef.current = res.headers.get("etag");
    setRemote(null);
    setJson(source);
    setSaved(true);
  }
  async function remove() {
    if (!window.confirm("Delete this slide from the project?")) return;
    const res = await fetch(`/api/slides/${slideId}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/library";
    else {
      const data = await res.json();
      setError(data.error?.message || "Could not delete slide.");
    }
  }
  return (
    <div className="detail-page">
      <header className="library-top">
        <a className="brand" href="/">
          folio<span className="brand-period">.</span>
        </a>
        <a href="/library">
          <ArrowLeft size={15} /> All slides
        </a>
      </header>
      {loading ? (
        <div className="detail-state">Loading slide…</div>
      ) : !record || !project ? (
        <div className="detail-state" role="alert">
          {error}
        </div>
      ) : (
        <main className="detail-main">
          <div className="detail-heading">
            <div>
              <span className="library-eyebrow">
                <FileJson size={14} />
                {project.name} / {record.layout}
              </span>
              <h1>{record.title}</h1>
              <p>
                Saved slide · Updated{" "}
                {new Date(record.updatedAt).toLocaleString()}
              </p>
            </div>
            <div className="detail-actions">
              <a href={`/api/projects/${projectId}/slides/${slideId}/export`}>Export JSON</a>
              <a href={`/api/projects/${projectId}/slides/${slideId}/screenshot`}>Download PNG</a>
              <a href={`/studio?project=${projectId}`}>Open project in editor</a>
            </div>
          </div>
          <div className="detail-columns">
            <div className="detail-preview">
              <div className="canvas-frame">
                {parsed?.success ? (
                  <SlideCanvas
                    slide={parsed.data}
                    theme={project.theme}
                    index={0}
                    total={1}
                  />
                ) : (
                  <div className="preview-invalid">
                    Fix the JSON to preview this slide.
                  </div>
                )}
              </div>
            </div>
            <div className="detail-editor">
              {remote && <div className="live-update-banner" role="status">
                This slide changed elsewhere. Your unsaved JSON is safe.
                <button onClick={() => {
                  const source = JSON.stringify(remote.record.content, null, 2);
                  setRecord(remote.record);
                  setJson(source);
                  savedJsonRef.current = source;
                  etagRef.current = remote.etag;
                  setRemote(null);
                  setError("");
                }}>Load latest</button>
              </div>}
              <label htmlFor="slide-json">Slide JSON</label>
              <textarea
                id="slide-json"
                spellCheck={false}
                value={json}
                onChange={(e) => {
                  setJson(e.target.value);
                  setSaved(false);
                }}
              />
              <div className="detail-buttons">
                <button onClick={save}>Save slide</button>
                <button className="delete" onClick={remove}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
              {error && (
                <pre className="detail-error" role="alert">
                  {error}
                </pre>
              )}
              {saved && (
                <p className="detail-saved" role="status">
                  <Check size={15} /> Slide saved to PostgreSQL.
                </p>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
