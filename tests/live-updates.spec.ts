import { test, expect } from "@playwright/test";
import { sampleDeck } from "../lib/deck";

test("conditional reads, stale saves, and open pages follow slide changes", async ({ page, request }) => {
  const created = await request.post("/api/projects", {
    data: { name: "Live update test", theme: "editorial" },
  });
  expect(created.status()).toBe(201);
  const project = (await created.json()).data;
  try {
    const original = { ...sampleDeck, name: "Live update test", slides: [sampleDeck.slides[0]] };
    expect((await request.put(`/api/projects/${project.id}/deck`, { data: original })).status()).toBe(200);
    const listing = (await (await request.get(`/api/projects/${project.id}/slides`)).json()).data;
    const slideId = listing[0].id;
    const deckUrl = `/api/projects/${project.id}/deck`;
    const firstDeck = await request.get(deckUrl);
    const deckTag = firstDeck.headers().etag;
    expect((await request.get(deckUrl, { headers: { "If-None-Match": deckTag } })).status()).toBe(304);
    const firstSlide = await request.get(`/api/slides/${slideId}`);
    const slideTag = firstSlide.headers().etag;
    expect((await request.get(`/api/slides/${slideId}`, { headers: { "If-None-Match": slideTag } })).status()).toBe(304);

    await page.goto(`/?project=${project.id}`);
    await expect(page.locator(".canvas-frame h1")).toHaveText(original.slides[0].title);
    const detail = await page.context().newPage();
    await detail.goto(`/library/projects/${project.id}/slides/${slideId}`);
    await expect(detail.getByRole("textbox", { name: "Slide JSON" })).not.toBeEmpty();
    expect(JSON.parse(await detail.getByRole("textbox", { name: "Slide JSON" }).inputValue()).title).toBe(original.slides[0].title);

    const changed = await request.patch(`/api/slides/${slideId}`, {
      data: { title: "Changed from the API" },
    });
    expect(changed.status()).toBe(200);
    expect((await request.get(deckUrl, { headers: { "If-None-Match": deckTag } })).status()).toBe(200);
    expect((await request.put(deckUrl, { headers: { "If-Match": deckTag }, data: original })).status()).toBe(409);
    expect((await request.put(`/api/slides/${slideId}`, {
      headers: { "If-Match": slideTag },
      data: { ...original.slides[0], title: "Stale write" },
    })).status()).toBe(409);
    await expect(page.locator(".canvas-frame h1")).toHaveText("Changed from the API", { timeout: 8000 });
    await expect(page.locator(`a[href="/library/projects/${project.id}/slides/${slideId}"] strong`)).toHaveText("Changed from the API", { timeout: 8000 });
    await expect(detail.getByRole("textbox", { name: "Slide JSON" })).toHaveValue(/Changed from the API/, { timeout: 8000 });

    await page.getByRole("textbox", { name: "Presentation name" }).fill("My unsaved deck name");
    await detail.getByRole("textbox", { name: "Slide JSON" }).fill(JSON.stringify({ ...original.slides[0], title: "My unsaved title" }));
    expect((await request.patch(`/api/slides/${slideId}`, { data: { title: "Another remote title" } })).status()).toBe(200);
    await expect(page.getByRole("button", { name: "Load latest" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("textbox", { name: "Presentation name" })).toHaveValue("My unsaved deck name");
    await expect(page.locator(".canvas-frame h1")).toHaveText("Changed from the API");
    await page.getByRole("button", { name: "Load latest" }).click();
    await expect(page.locator(".canvas-frame h1")).toHaveText("Another remote title");
    await expect(detail.getByRole("button", { name: "Load latest" })).toBeVisible({ timeout: 8000 });
    await expect(detail.getByRole("textbox", { name: "Slide JSON" })).toHaveValue(/My unsaved title/);
    await detail.getByRole("button", { name: "Load latest" }).click();
    await expect(detail.getByRole("textbox", { name: "Slide JSON" })).toHaveValue(/Another remote title/);
    await detail.close();
  } finally {
    await request.delete(`/api/projects/${project.id}`);
  }
});
