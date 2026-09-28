import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { sampleDeck } from "../lib/deck";

test("MCP discovers tools and creates and updates persisted slides with revision protection", async ({ request, baseURL }) => {
  const client = new Client({ name: "folio-test", version: "1.0.0" });
  let projectId: string | undefined;
  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await client.callTool({ name, arguments: args });
    expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
    return result.structuredContent as { data: any; etag?: string };
  }
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("/api/mcp", baseURL)));
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(expect.arrayContaining([
      "list_projects", "create_project", "list_slides", "get_slide", "create_slide",
      "update_slide", "replace_slide", "get_deck", "save_deck",
    ]));
    projectId = (await call("create_project", { name: "MCP integration test" })).data.id;
    expect((await call("list_projects")).data.some((p: { id: string }) => p.id === projectId)).toBe(true);
    const content = { ...sampleDeck.slides[0], id: "mcp-cover", title: "Created through MCP" };
    const created = (await call("create_slide", { projectId, slide: content })).data;
    expect((await call("list_slides", { projectId })).data).toHaveLength(1);
    const initial = await call("get_slide", { slideId: created.id });
    const updated = await call("update_slide", {
      slideId: created.id, etag: initial.etag, changes: { title: "Updated through MCP" },
    });
    expect(updated.data.content.notes).toBe(content.notes);
    expect((await (await request.get(`/api/slides/${created.id}`)).json()).data.title).toBe("Updated through MCP");
    const stale = await client.callTool({ name: "update_slide", arguments: {
      slideId: created.id, etag: initial.etag, changes: { title: "Stale edit" },
    } });
    expect(stale.isError).toBe(true);
    expect(stale.structuredContent).toMatchObject({ error: { code: "STALE_REVISION" } });
    const invalid = await client.callTool({ name: "update_slide", arguments: {
      slideId: created.id, etag: updated.etag, changes: { layout: "chart" },
    } });
    expect(invalid.isError).toBe(true);
    expect(invalid.structuredContent).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    const duplicate = await client.callTool({ name: "create_slide", arguments: { projectId, slide: content } });
    expect(duplicate.isError).toBe(true);
    expect(duplicate.structuredContent).toMatchObject({ error: { code: "CONFLICT" } });
    const badInput = await client.callTool({ name: "create_slide", arguments: {
      projectId, slide: { ...content, id: "invalid", madeUp: true },
    } });
    expect(badInput.isError).toBe(true);
    const replaced = await call("replace_slide", {
      slideId: created.id, etag: updated.etag,
      slide: { ...content, layout: "statement", title: "Replaced" },
    });
    expect(replaced.data.id).toBe(created.id);
    const before = await call("get_deck", { projectId });
    const deck = { name: "MCP deck", theme: "midnight", slides: [replaced.data.content, { ...content, id: "second" }] };
    await call("save_deck", { projectId, etag: before.etag, deck });
    expect((await call("get_deck", { projectId })).data).toEqual(deck);
    expect((await call("list_slides", { projectId })).data[0].id).toBe(created.id);
    const staleDeck = await client.callTool({ name: "save_deck", arguments: { projectId, etag: before.etag, deck } });
    expect(staleDeck.isError).toBe(true);
    expect(staleDeck.structuredContent).toMatchObject({ error: { code: "STALE_REVISION" } });
    const missing = await client.callTool({ name: "get_slide", arguments: { slideId: crypto.randomUUID() } });
    expect(missing.structuredContent).toMatchObject({ error: { code: "NOT_FOUND" } });
  } finally {
    await client.close();
    if (projectId) await request.delete(`/api/projects/${projectId}`);
  }
});

test("MCP rejects cross-origin requests and unsupported streams", async ({ request }) => {
  expect((await request.post("/api/mcp", {
    headers: { Origin: "https://untrusted.example" }, data: {},
  })).status()).toBe(403);
  expect((await request.get("/api/mcp")).status()).toBe(405);
  expect((await request.delete("/api/mcp")).status()).toBe(405);
  const malformed = await request.post("/api/mcp", {
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    data: Buffer.from("{broken"),
  });
  expect(malformed.status()).toBe(400);
});
