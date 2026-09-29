import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

const starter = JSON.parse(readFileSync("public/first-horizon-deck.json", "utf8"));

test("First Horizon applies without replacing content and survives import, export and reload", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".canvas-frame .slide-canvas");
  const originalTitle = await canvas.locator("h1").textContent();
  await page.getByRole("button", { name: "First Horizon", exact: true }).click();
  await expect(canvas.locator("h1")).toHaveText(originalTitle!);
  await expect(canvas).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(canvas.getByRole("img", { name: "First Horizon" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download First Horizon starter deck" })).toHaveAttribute("href", "/first-horizon-deck.json");
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles("public/first-horizon-deck.json");
  await expect(page.getByRole("textbox", { name: "Deck JSON" })).toContainText("first-horizon");
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByRole("textbox", { name: "Presentation name" })).toHaveValue(starter.name);
  await expect(page.locator(".thumbnail-row")).toHaveCount(6);
  await page.reload();
  await expect(canvas).toHaveClass(/theme-first-horizon/);
  await expect(canvas.locator("img")).toHaveJSProperty("naturalWidth", 229);
  for (let i = 0; i < starter.slides.length; i++) {
    await page.locator(".thumbnail-row").nth(i).click();
    await expect(canvas.locator("h1")).toHaveText(starter.slides[i].title);
    await expect(canvas.getByRole("img", { name: "First Horizon" })).toBeVisible();
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("menuitem", { name: "Export as JSON" }).click();
  const exported = JSON.parse(readFileSync((await (await download).path())!, "utf8"));
  expect(exported).toEqual(starter);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.locator(".presentation-mode").getByRole("img", { name: "First Horizon" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".presentation-mode")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
});

test("First Horizon fits a mobile viewport", async ({ browser }) => {
  // Use a fresh window: native fullscreen restoration can outlast the DOM
  // fullscreenchange event, making an immediate window resize fail in Chromium.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL!);
    await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
    await page.locator('input[type="file"]').setInputFiles("public/first-horizon-deck.json");
    await expect(page.getByRole("textbox", { name: "Deck JSON" })).toContainText("first-horizon");
    await page.getByRole("button", { name: "Apply changes" }).click();
    await expect(page.locator(".canvas-frame .slide-canvas")).toHaveClass(/theme-first-horizon/);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await context.close();
  }
});

test("First Horizon deck persists through project APIs and renders in the slide library", async ({ request, page }) => {
  const created = await request.post("/api/projects", { data: { name: starter.name, theme: starter.theme } });
  expect(created.status()).toBe(201);
  const project = (await created.json()).data;
  try {
    const saved = await request.put(`/api/projects/${project.id}/deck`, { data: starter });
    expect(saved.ok()).toBeTruthy();
    const loaded = await request.get(`/api/projects/${project.id}/deck`);
    expect((await loaded.json()).data).toEqual(starter);
    const slides = (await (await request.get(`/api/projects/${project.id}/slides`)).json()).data;
    await page.goto(`/library/projects/${project.id}/slides/${slides[0].id}`);
    await expect(page.locator(".slide-canvas")).toHaveClass(/theme-first-horizon/);
    await expect(page.getByRole("img", { name: "First Horizon" })).toBeVisible();
  } finally {
    await request.delete(`/api/projects/${project.id}`);
  }
});
