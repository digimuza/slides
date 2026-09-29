import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { sampleDeck } from "../lib/deck";

test("create a project slide, update it through MCP, and export it through the API", async ({ page, request, baseURL }) => {
  const client = new Client({ name: "create-flow-test", version: "1.0.0" });
  let projectId: string | undefined;
  try {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Create a new slide." })).toBeVisible();
    await page.getByRole("button", { name: "Create Editorial opening slide" }).click();
    await expect(page).toHaveURL(/\/studio\?project=/);
    projectId = new URL(page.url()).searchParams.get("project") || undefined;
    expect(projectId).toBeTruthy();
    await expect(page.locator(".canvas-frame h1")).toHaveText("Your big idea starts here.");

    const projects = (await (await request.get("/api/projects")).json()).data;
    expect(projects.some((project: { id: string }) => project.id === projectId)).toBe(true);

    const slides = (await (await request.get(`/api/projects/${projectId}/slides`)).json()).data;
    expect(slides).toHaveLength(1);
    const slideId: string = slides[0].id;

    await client.connect(new StreamableHTTPClientTransport(new URL("/api/mcp", baseURL)));
    const current = await client.callTool({ name: "get_slide", arguments: { slideId } });
    expect(current.isError).not.toBe(true);
    const etag = (current.structuredContent as { etag: string }).etag;
    const updated = await client.callTool({ name: "update_slide", arguments: {
      slideId, etag, changes: { title: "Updated live through MCP" },
    } });
    expect(updated.isError).not.toBe(true);
    await expect(page.locator(".canvas-frame h1")).toHaveText("Updated live through MCP", { timeout: 10_000 });

    const deckExport = await request.get(`/api/projects/${projectId}/export`);
    expect(deckExport.ok()).toBe(true);
    expect(deckExport.headers()["content-disposition"]).toContain("attachment");
    expect((await deckExport.json()).slides[0].title).toBe("Updated live through MCP");
    const slideExport = await request.get(`/api/projects/${projectId}/slides/${slideId}/export`);
    expect(slideExport.ok()).toBe(true);
    expect((await slideExport.json()).title).toBe("Updated live through MCP");

    const screenshot = await request.get(`/api/projects/${projectId}/slides/${slideId}/screenshot`, { timeout: 60_000 });
    if (!screenshot.ok()) throw new Error(await screenshot.text());
    expect(screenshot.headers()["content-type"]).toContain("image/png");
    expect((await screenshot.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

    const diagramResponse = await request.post(`/api/projects/${projectId}/slides`, { data: {
      id: "diagram", layout: "diagram", eyebrow: "FLOW", title: "A simple exchange",
      description: "", notes: "", mermaid: "sequenceDiagram\nAlice->>Bob: Hello",
    } });
    expect(diagramResponse.ok()).toBe(true);
    const diagramId: string = (await diagramResponse.json()).data.id;
    const diagramImage = await request.get(`/api/projects/${projectId}/slides/${diagramId}/screenshot`, { timeout: 60_000 });
    if (!diagramImage.ok()) throw new Error(await diagramImage.text());
    expect(diagramImage.headers()["content-type"]).toContain("image/png");
  } finally {
    await client.close();
    if (projectId) await request.delete(`/api/projects/${projectId}`);
  }
});

test("import a slide JSON into a saved project and reject invalid JSON", async ({ page, request }) => {
  let projectId: string | undefined;
  try {
    await page.goto("/");
    const input = page.getByLabel("Upload slide or deck JSON");
    await input.setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from("{broken") });
    await expect(page.locator(".create-error")).toContainText("not valid JSON");
    await input.setInputFiles({
      name: "my-slide.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...sampleDeck.slides[0], id: "imported-cover", title: "Imported through JSON" })),
    });
    await expect(page).toHaveURL(/\/studio\?project=/);
    projectId = new URL(page.url()).searchParams.get("project") || undefined;
    const deck = await request.get(`/api/projects/${projectId}/deck`);
    expect(deck.ok()).toBe(true);
    expect((await deck.json()).data.slides).toMatchObject([{ id: "imported-cover", title: "Imported through JSON" }]);
  } finally {
    if (projectId) await request.delete(`/api/projects/${projectId}`);
  }
});

test("create the first slide inside an existing empty project", async ({ page, request }) => {
  const response = await request.post("/api/projects", { data: { name: "Existing project", theme: "editorial" } });
  expect(response.ok()).toBe(true);
  const projectId: string = (await response.json()).data.id;
  try {
    await page.goto(`/?project=${projectId}`);
    await expect(page.getByText("Adding the first slide to")).toContainText("Existing project");
    await page.getByRole("button", { name: "Create Midnight statement slide" }).click();
    await expect(page).toHaveURL(new RegExp(`/studio\\?project=${projectId}`));
    const deck = (await (await request.get(`/api/projects/${projectId}/deck`)).json()).data;
    expect(deck.name).toBe("Existing project");
    expect(deck.theme).toBe("midnight");
    expect(deck.slides).toHaveLength(1);
  } finally {
    await request.delete(`/api/projects/${projectId}`);
  }
});
