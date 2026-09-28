import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as projects from "@/app/api/projects/route";
import * as slides from "@/app/api/projects/[projectId]/slides/route";
import * as slide from "@/app/api/slides/[slideId]/route";
import * as deck from "@/app/api/projects/[projectId]/deck/route";
import { deckSchema, projectInputSchema, slidePatchSchema, slideSchema } from "./slide-schema";

// Call the existing handlers in-process so REST and MCP share validation,
// transactions, revision checks, and error responses without an HTTP round trip.
function request(method = "GET", data?: unknown, etag?: string) {
  return new Request("http://folio.internal/api", {
    method,
    headers: { "Content-Type": "application/json", ...(etag ? { "If-Match": etag } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

async function result(response: Promise<Response>) {
  const res = await response;
  const payload = await res.json();
  const etag = res.headers.get("etag");
  const output = { ...payload, ...(etag ? { etag } : {}) };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }],
    structuredContent: output,
    ...(!res.ok ? { isError: true } : {}),
  };
}

export function createMcpServer() {
  const server = new McpServer({ name: "folio-slides", version: "1.0.0" }, {
    instructions: "Manage saved Folio slides. Start with list_projects or create_project. Slide IDs returned by the API are database UUIDs; content.id is the source ID within a project. Read before updating and pass the returned etag. Changes are saved immediately and appear through the studio's live refresh. Browser-only drafts must first be saved to a project.",
  });
  const projectId = z.string().uuid().describe("Saved project's database UUID.");
  const slideId = z.string().uuid().describe("Slide's database UUID, not content.id/sourceId.");
  const etag = z.string().min(1).describe("Exact etag returned by get_slide or get_deck. A stale value fails; read again before retrying.");
  const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const create = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
  const update = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };

  server.registerTool("list_projects", {
    description: "List saved projects, their database UUIDs, themes, and slide counts.",
    inputSchema: z.object({}).strict(), annotations: read,
  }, () => result(projects.GET()));
  server.registerTool("create_project", {
    description: "Create an empty project to hold new slides.",
    inputSchema: projectInputSchema, annotations: create,
  }, (input) => result(projects.POST(request("POST", input))));
  server.registerTool("list_slides", {
    description: "List a project's slides in presentation order, including content and database UUIDs.",
    inputSchema: z.object({ projectId }).strict(), annotations: read,
  }, (input) => result(slides.GET(request(), { params: Promise.resolve(input) })));
  server.registerTool("get_slide", {
    description: "Read a saved slide and its etag before editing it.",
    inputSchema: z.object({ slideId }).strict(), annotations: read,
  }, (input) => result(slide.GET(request(), { params: Promise.resolve(input) })));
  server.registerTool("create_slide", {
    description: "Append a slide to a project. content.id must be unique within the project. Use empty strings for unused eyebrow, description, and notes. All ten layouts are supported.",
    inputSchema: z.object({ projectId, slide: slideSchema }).strict(), annotations: create,
  }, ({ projectId, slide: content }) => result(slides.POST(request("POST", content), { params: Promise.resolve({ projectId }) })));
  server.registerTool("update_slide", {
    description: "Merge changed fields into a saved slide. Arrays are replaced as a whole. The complete merged slide is validated. Use replace_slide when removing optional fields or changing layouts with incompatible fields.",
    inputSchema: z.object({ slideId, etag, changes: slidePatchSchema }).strict(), annotations: update,
  }, ({ slideId, etag, changes }) => result(slide.PATCH(request("PATCH", changes, etag), { params: Promise.resolve({ slideId }) })));
  server.registerTool("replace_slide", {
    description: "Replace a slide's complete content while preserving its database UUID and URL. Omitted optional fields are removed.",
    inputSchema: z.object({ slideId, etag, slide: slideSchema }).strict(), annotations: update,
  }, ({ slideId, etag, slide: content }) => result(slide.PUT(request("PUT", content, etag), { params: Promise.resolve({ slideId }) })));
  server.registerTool("get_deck", {
    description: "Read a project's complete deck and etag for a bulk save.",
    inputSchema: z.object({ projectId }).strict(), annotations: read,
  }, (input) => result(deck.GET(request(), { params: Promise.resolve(input) })));
  server.registerTool("save_deck", {
    description: "Atomically save 1–100 slides, project name, theme, and order. Matching source IDs preserve slide URLs. Existing slides omitted from the input are retained, not deleted. Read get_deck first for its etag, including for a new empty project.",
    inputSchema: z.object({ projectId, etag, deck: deckSchema }).strict(), annotations: update,
  }, ({ projectId, etag, deck: content }) => result(deck.PUT(request("PUT", content, etag), { params: Promise.resolve({ projectId }) })));
  return server;
}
