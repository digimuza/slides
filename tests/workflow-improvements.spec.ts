import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("reorder keeps slide identity, persists, exports notes, and respects boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Move slide earlier" })).toBeDisabled();
  const title = await page.locator(".canvas-frame h1").innerText();
  await page.getByRole("textbox", { name: "Speaker notes", exact: true }).fill("Rehearse this opening.\nPause for questions.");
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem("folio-deck")!).slides[0]);
  await page.getByRole("button", { name: "Move slide later" }).click();
  await expect(page.locator(".thumbnail-row[aria-current=true]")).toHaveAttribute("aria-label", /^Slide 2:/);
  await expect(page.locator(".canvas-frame h1")).toHaveText(title);
  await expect(page.getByRole("textbox", { name: "Speaker notes", exact: true })).toHaveValue(original.notes);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all speaker notes" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/-notes\.txt$/);
  const notes = readFileSync((await download.path())!, "utf8");
  expect(notes).toContain(`2. ${title.replace(/\n/g, " ")}\n${original.notes}`);
  await page.reload();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("folio-deck")!).slides);
  expect(stored[1]).toEqual(original);
  await page.locator(".thumbnail-row").last().click();
  await expect(page.getByRole("button", { name: "Move slide later" })).toBeDisabled();
  await page.getByRole("button", { name: "Move slide earlier" }).click();
  await expect(page.getByRole("button", { name: "Move slide later" })).toBeEnabled();
});

test("library searches titles, project names and IDs, combines filters, and clears empty results", async ({ page, request }) => {
  const key = crypto.randomUUID();
  const created = await request.post("/api/projects", { data: { name: `Workflow discovery ${key}`, theme: "editorial" } });
  expect(created.ok()).toBeTruthy();
  const project = (await created.json()).data;
  try {
    const saved = await request.put(`/api/projects/${project.id}/deck`, { data: {
      name: `Workflow discovery ${key}`, theme: "editorial", slides: [
        { id: `opening-${key}`, layout: "cover", title: `Quarterly ${key}`, eyebrow: "REVIEW", description: "Planning together", notes: "Welcome" },
        { id: "closing-unique", layout: "closing", title: "Next actions", eyebrow: "NEXT", description: "Our next steps", notes: "" },
      ],
    } });
    expect(saved.ok()).toBeTruthy();
    await page.goto("/library");
    const search = page.getByRole("searchbox", { name: "Search saved slides" });
    await search.fill(`  QUARTERLY ${key}  `);
    await expect(page.locator(".saved-slide-card")).toHaveCount(1);
    await page.getByRole("combobox", { name: "Slide layout" }).selectOption("closing");
    await expect(page.getByText("No matching slides", { exact: true })).toBeVisible();
    await search.fill(`workflow discovery ${key}`);
    await expect(page.locator(".saved-slide-card")).toHaveCount(1);
    await expect(page.locator(".saved-slide-card")).toContainText("Next actions");
    await page.getByRole("combobox", { name: "Slide layout" }).selectOption("");
    await search.fill(`opening-${key}`);
    await expect(page.locator(".saved-slide-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(search).toHaveValue("");
    await expect(page.locator(".saved-slide-card").filter({ hasText: `Quarterly ${key}` })).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  } finally {
    await request.delete(`/api/projects/${project.id}`).catch(() => {});
  }
});
