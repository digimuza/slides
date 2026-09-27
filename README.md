# Folio

A Next.js presentation studio with JSON-driven slides, three visual themes, and Motion animations.

## Run

```sh
npm install
npm run dev -- --port 3011
```

Open http://localhost:3011. For production, run `npm run build` then `npm start`.

## Docker image

The [GitHub Actions workflow](.github/workflows/pr-validation.yml) installs dependencies with `npm ci`, builds and tests the Next.js app on Linux, then builds a Docker image by copying the standalone server and static assets. Pull requests verify the image build. Successful pushes to `main` publish `ghcr.io/OWNER/REPO:latest` and `ghcr.io/OWNER/REPO:<commit-sha>` to GitHub Container Registry. Replace `OWNER/REPO` with this repository's lowercase path.

Run the published image with a PostgreSQL URL reachable from the container:

```sh
docker run --rm -p 3000:3000 -e DATABASE_URL="$DATABASE_URL" ghcr.io/OWNER/REPO:latest
```

Open http://localhost:3000. `DATABASE_URL` is read at runtime; it is not baked into the image. The Dockerfile expects output from `npm run build` and does not install dependencies inside the image.

## Create a presentation

Choose **Edit JSON** to modify a complete deck or import a `.json` file. Apply changes to validate and render it. **Export** downloads your deck, including speaker notes. **Content** edits individual slide text. Add, duplicate, or delete slides using the editor controls.

A reference deck is in `public/sample-deck.json`. The TypeScript schema, validation, and default deck are in `lib/deck.ts`.

```json
{
  "name": "My presentation",
  "theme": "editorial",
  "slides": [{
    "id": "intro",
    "layout": "cover",
    "eyebrow": "A NEW PERSPECTIVE",
    "title": "Ideas worth\nsharing.",
    "description": "Your story starts here.",
    "notes": "Introduce the topic."
  }]
}
```

- Themes: `editorial`, `midnight`, `botanical`.
- Layouts: `cover`, `statement`, `metrics`, `comparison`, `quote`, `closing`, `diagram`, `code`, `flowchart`.
- Metrics and comparison slides require 1–4 `items`, each with `value`, `label`, and optional `detail` strings.
- Slide IDs must be unique; decks support 1–100 slides.
- Text uses `\n` for intentional line breaks. Keep copy brief for a balanced slide layout.

**Present** opens fullscreen, with an in-page fallback when browser fullscreen is unavailable. Arrow keys navigate, Home/End jump to the first/last slide, Space advances in presentation mode, and Escape exits. Reduced-motion preferences disable slide movement.

Decks autosave locally while editing; use **Save to project** for PostgreSQL storage. Export JSON for backups and transfer between devices. This version has no accounts, collaboration, AI generation, or PDF/PPTX export. Google Fonts enhances typography when available; local font fallbacks keep the app usable offline.

## Checks

```sh
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run build
npx playwright test
```

Browser tests use installed Google Chrome locally. Playwright starts the production server on port 3011 when none is running; build first and provide `DATABASE_URL` for API tests. Set `TEST_URL` to use a different server. Tests cover editing, themes, slide creation, invalid JSON, persistence, export, presentation navigation, live updates, and responsive layout. The [PR validation workflow](.github/workflows/pr-validation.yml) runs these checks with Chromium and a PostgreSQL service on pull requests and pushes to `main`, and uploads a report if tests fail.

Built with [Next.js](https://nextjs.org/docs/app/getting-started) and [Motion for React](https://motion.dev/docs/react).

## Interactive Mermaid diagrams

Use **Add slide → diagram** to insert the large reference sequence diagram into any existing deck. The default sample now includes this slide. Edit **Content → Mermaid source**, or set `"layout": "diagram"` and add a `"mermaid"` string in JSON. Source is saved and exported with the deck; syntax errors appear inside the slide without breaking the editor.

The reference follows an order across ten participants, with authentication, idempotency, inventory reservations, payment success/failure, outbox event delivery, and parallel fulfillment/notifications. Its source lives in `lib/sequence.ts`.

- Drag to pan; scroll or pinch to zoom.
- Use **+ / −** buttons to zoom, **100%** to read at actual size, and **Fit** to center the complete diagram.
- Focus the diagram to use `+`, `-`, `0` (fit), or **Shift + arrow keys** (pan). Plain arrows still navigate slides.
- The same controls work in fullscreen. Resizing the viewport fits the diagram again.
- Source renders locally to SVG using Mermaid's strict security mode. Mermaid loads only when a diagram is rendered.

Click **Fullscreen** in the diagram toolbar to expand only the diagram, without slide headings or margins. Pan, zoom, 100%, and Fit remain available. **Close** or **Escape** returns to the slide; closing with the button during a presentation keeps the presentation open. If browser fullscreen is unavailable, the diagram fills the app viewport instead.

## Animated code and flowchart reveals

Import `public/github-actions-deck.json` for a two-slide walkthrough, or use **Add slide → Add GitHub Actions step-by-step flow** and **Add slide → code**. The complete sample deck also includes both.

**Next slide**, Right, Down, and presentation Space reveal the next step before changing slides. Left, Previous, and Up rewind steps. Arrow direction is consistent across code, Mermaid, and React Flow, including fullscreen. Legacy `advanceKey` fields are ignored and removed on import. Click the chart or code to reveal; dragging the chart still pans. Inline **Back step**, **Next step**, and **Restart reveal** controls work on touch devices and in diagram fullscreen. At the final reveal, the outer Next slide control advances to the next slide. Diagram-only fullscreen keeps you in the diagram until you close it.

Select **Content** to edit the current step's label and source; use **Edit JSON** to add or reorder steps. Reveal positions are temporary and reset when you change slides; step content is saved/exported with the deck. Existing customized decks are preserved.

Code slides use `layout: "code"`, optional `fileName` / `language` labels, and `steps` containing `{ "label": "…", "code": "…" }`. Each code string is a new block appended to previous blocks; lines animate in with reduced-motion support. The code panel scrolls to the newly revealed block.

Diagram slides can have `steps` containing `{ "label": "…", "mermaid": "…" }`. Each Mermaid string is a complete valid diagram for that stage, including all nodes/edges you want visible. This supports branches as well as linear flows. Each Mermaid stage fades in and fits the available space; use 100%, wheel/pinch zoom, drag-to-pan, and diagram fullscreen when you need a closer look. Shift + arrows pans without revealing steps.

### React Flow charts

Use **Add slide → flowchart** for the GitHub Actions example. Flowcharts use React Flow (`@xyflow/react`); sequence diagrams continue to use Mermaid. React Flow reveals native nodes and edges in fixed positions, animates newly revealed nodes, and follows the newest three steps so longer graphs stay readable. **Fit all** shows the complete revealed graph; **Follow step** restores the focused view. Pan, wheel/pinch zoom, Shift + arrows, and fullscreen are available.

Each flowchart has `steps` with labels and a `flow` object. Nodes have a unique `id`, `label`, `position: { x, y }`, a zero-based `step`, and an optional `kind` (`process` or `decision`). Edges have a unique `id`, `source`, `target`, and optional `label`; they appear when both endpoints are revealed. Edit node labels in Content, and edit positions, connections, or reveal order through JSON. Layout positions persist in the deck; dragging the presentation pans the view.

The unchanged legacy GitHub Mermaid example migrates automatically to React Flow, including saved decks and imported JSON. Customized Mermaid diagrams remain intact. The updated example is in `public/github-actions-deck.json`.

```json
{
  "id": "flow",
  "layout": "flowchart",
  "eyebrow": "CI PIPELINE",
  "title": "From idea to automation",
  "description": "Right reveals. Left goes back.",
  "notes": "Explain each handoff before advancing.",
  "steps": [
    { "label": "Developer" },
    { "label": "Commit to a branch" },
    { "label": "Trigger automation" }
  ],
  "flow": {
    "nodes": [
      { "id": "a", "label": "Developer", "position": { "x": 0, "y": 0 }, "step": 0 },
      { "id": "b", "label": "Commits to branch", "position": { "x": 260, "y": 0 }, "step": 1 },
      { "id": "c", "label": "GitHub Actions triggered", "position": { "x": 520, "y": 0 }, "step": 2 }
    ],
    "edges": [
      { "id": "ab", "source": "a", "target": "b" },
      { "id": "bc", "source": "b", "target": "c" }
    ]
  }
}
```

## PostgreSQL projects and slide API

The studio can save decks to PostgreSQL and open every saved slide through a direct URL. Local autosave remains available while editing. Start the local database with:

Open project decks, individual slide pages, and the library refresh automatically while the tab is visible. They check for changes every two seconds and refresh when the tab regains focus. Deck and slide GET endpoints support `If-None-Match` and return `304` when unchanged. The editor sends `If-Match` on save; a stale version returns `409 STALE_REVISION`. If you have unsaved edits when a remote change arrives, a **Load latest** banner lets you choose when to replace them. This uses the existing REST server and needs no WebSocket service.

```sh
docker compose up -d postgres
cp .env.example .env.local
npm run dev -- --port 3011
```

The container uses port `5433` and a persistent Docker volume. Set `DATABASE_URL` to an existing PostgreSQL database instead if you prefer. Tables and indexes are created automatically on the first API request. Keep credentials in `.env.local`; the example credentials are only for local development.

Choose **Save to project** in the editor to create or select a project. The save writes the current deck in one database transaction and updates existing slides with the same JSON `id`, preserving their links. Open **Slide library** to browse projects and individual slides. Edit a slide through its library page or the REST API. **Open in editor** loads a project's stored deck. Slides removed from the editor are retained in the database until explicitly deleted through their individual endpoint.

All API responses use `{ "data": ... }` on success or `{ "error": { "code", "message", "issues" } }` on failure. `issues` includes Zod field paths. Invalid JSON syntax returns 400, invalid slide data returns 422, missing resources return 404, duplicate slide source IDs return 409, and an unavailable database returns 503. Slide JSON is strictly validated: unknown fields, missing titles/layouts, structurally invalid Mermaid/code steps, broken React Flow edges, and invalid step indices are rejected. No invalid slide is stored.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET, POST | `/api/projects` | List or create projects |
| GET, PATCH, DELETE | `/api/projects/{projectId}` | Read, rename, or delete a project |
| GET, PUT | `/api/projects/{projectId}/deck` | Read or atomically save a deck |
| GET, POST | `/api/projects/{projectId}/slides` | List or create individual slides |
| GET, PUT, PATCH, DELETE | `/api/projects/{projectId}/slides/{slideId}` | Manage a slide within a project |
| GET | `/api/slides?projectId={projectId}` | List slide summaries across projects or filter them |
| GET, PUT, PATCH, DELETE | `/api/slides/{slideId}` | Manage one slide by its direct ID |

`POST /api/projects` accepts `{ "name": "My project", "theme": "editorial" }`. `POST /api/projects/{projectId}/slides` and `PUT /api/slides/{slideId}` accept a raw slide object matching the deck schema, including `id`, `layout`, `title`, `eyebrow`, `description`, and `notes`. `PATCH /api/slides/{slideId}` accepts changed slide fields, merges them with the saved object, and validates the complete result. `PUT /api/projects/{projectId}/deck` accepts the complete deck JSON. Saved slides also have links at `/library/projects/{projectId}/slides/{slideId}`.

This local workspace has no user accounts or API authentication. Add authentication and project ownership before exposing these endpoints to other users or the public internet.
