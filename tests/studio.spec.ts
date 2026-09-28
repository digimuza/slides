import { readFileSync } from "node:fs";
import { test, expect, type Locator } from "@playwright/test";

async function expectFlowFitted(container: Locator) {
  await expect.poll(() => container.locator(".flow-viewport").evaluate((viewport) => {
    const bounds = viewport.getBoundingClientRect();
    const nodes = Array.from(viewport.querySelectorAll(".react-flow__node"))
      .map((node) => node.getBoundingClientRect());
    if (!nodes.length) return false;
    const left = Math.min(...nodes.map((node) => node.left));
    const right = Math.max(...nodes.map((node) => node.right));
    const top = Math.min(...nodes.map((node) => node.top));
    const bottom = Math.max(...nodes.map((node) => node.bottom));
    return left >= bounds.left && right <= bounds.right &&
      top >= bounds.top && bottom <= bounds.bottom &&
      Math.abs((left + right - bounds.left - bounds.right) / 2) < 3 &&
      Math.abs((top + bottom - bounds.top - bounds.bottom) / 2) < 3;
  })).toBe(true);
}

test("themes, slide creation, content, JSON validation, persistence and presentation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Presentation name" }),
  ).toHaveValue("A little more possibility");
  await page.getByRole("button", { name: "Midnight", exact: true }).click();
  await expect(page.locator(".canvas-frame .slide-canvas")).toHaveClass(
    /theme-midnight/,
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".canvas-frame h1")).toHaveText(
    "The future belongs\nto the curious.",
  );
  await page.getByRole("button", { name: "Content", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("An idea worth sharing");
  await expect(page.locator(".canvas-frame h1")).toHaveText(
    "An idea worth sharing",
  );
  await page.getByRole("button", { name: "Add slide", exact: true }).click();
  await page.getByRole("button", { name: "metrics", exact: true }).click();
  await expect(page.locator(".thumbnail-row")).toHaveCount(10);
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  const json = await page
    .getByRole("textbox", { name: "Deck JSON" })
    .inputValue();
  await page.getByRole("textbox", { name: "Deck JSON" }).fill('{"bad":true}');
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator(".modal").getByRole("alert")).toBeVisible();
  await page.getByRole("textbox", { name: "Deck JSON" }).fill(json);
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".thumbnail-row")).toHaveCount(10);
  await expect(page.locator(".canvas-frame .slide-canvas")).toHaveClass(
    /theme-midnight/,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await expect(page.locator(".presentation-mode")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".presentation-mode h1")).toHaveText(
    "An idea worth sharing",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".presentation-mode")).toHaveCount(0);
});

test("desktop and mobile layout fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({ path: "/tmp/folio-desktop.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/folio-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("Mermaid diagrams render, zoom, pan, fit, recover from syntax errors, and present", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Slide 6: From checkout/ }).click();
  const canvas = page.locator(".canvas-frame");
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible({
    timeout: 20000,
  });
  await expect(canvas.locator(".diagram-svg")).toContainText(
    "Payment provider",
  );
  const zoom = canvas.getByLabel("Diagram zoom");
  const initialZoom = await zoom.textContent();
  const transform = canvas.locator(".react-transform-component");
  const initialTransform = await transform.getAttribute("style");
  await canvas.getByRole("button", { name: "Zoom in diagram" }).click();
  await expect(zoom).not.toHaveText(initialZoom!);
  const viewport = canvas.locator(".diagram-viewport");
  const box = (await viewport.boundingBox())!;
  const beforePan = await transform.getAttribute("style");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(transform).not.toHaveAttribute("style", beforePan!);
  await canvas.getByRole("button", { name: "Fit diagram" }).click();
  await expect(zoom).toHaveText(initialZoom!);
  await expect(transform).toHaveAttribute("style", initialTransform!);
  await viewport.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect(transform).not.toHaveAttribute("style", initialTransform!);
  await expect(canvas.locator("h1")).toHaveText("From checkout to doorstep.");
  await canvas.getByRole("button", { name: "Fit diagram" }).click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -180);
  await expect(zoom).not.toHaveText(initialZoom!);
  await page.getByRole("button", { name: "Content", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Mermaid source" });
  const original = await source.inputValue();
  await source.fill("sequenceDiagram\n this is invalid");
  await expect(canvas.getByRole("alert")).toContainText(
    "Check your Mermaid syntax",
  );
  await source.fill(original);
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  const presentation = page.locator(".presentation-mode");
  await expect(presentation.locator(".diagram-svg svg")).toBeVisible();
  const presentZoom = presentation.getByLabel("Diagram zoom");
  const beforeZoom = await presentZoom.textContent();
  await presentation.getByRole("button", { name: "Zoom in diagram" }).click();
  await expect(presentZoom).not.toHaveText(beforeZoom!);
  await page.keyboard.press("Escape");
  await expect(presentation).toHaveCount(0);
  await page.screenshot({ path: "/tmp/folio-diagram.png", fullPage: true });
});

test("diagram insertion, readable size, mobile fit and source persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add slide", exact: true }).click();
  await page.getByRole("button", { name: "diagram", exact: true }).click();
  const canvas = page.locator(".canvas-frame");
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible({
    timeout: 15000,
  });
  await canvas.getByRole("button", { name: "Actual size diagram" }).click();
  await expect(canvas.getByLabel("Diagram zoom")).toHaveText("100%");
  await page.getByRole("button", { name: "Midnight", exact: true }).click();
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Mermaid source" });
  await source.fill("sequenceDiagram\n    Alice->>Bob: Persist this message");
  await expect(canvas.locator(".diagram-svg")).toContainText(
    "Persist this message",
  );
  await page.reload();
  await page.getByRole("button", { name: /Slide 2: From checkout/ }).click();
  await expect(canvas.locator(".diagram-svg")).toContainText(
    "Persist this message",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await canvas.getByRole("button", { name: "Fit diagram" }).click();
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const toolbar = await canvas.locator(".diagram-toolbar").boundingBox();
  expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(390);
});

test("diagram-only fullscreen fills viewport and closes back to editor or presentation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Slide 6: From checkout/ }).click();
  const canvas = page.locator(".canvas-frame");
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible();
  await canvas
    .getByRole("button", { name: "Fullscreen diagram", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Fullscreen diagram" });
  await expect(dialog).toBeVisible();
  const size = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(size!.width).toBe(viewport.width);
  expect(size!.height).toBe(viewport.height);
  await dialog.getByRole("button", { name: "Actual size diagram" }).click();
  await expect(dialog.getByLabel("Diagram zoom")).toHaveText("100%");
  await dialog.locator(".diagram-viewport").focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close fullscreen diagram" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    canvas.getByRole("button", { name: "Fullscreen diagram", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Present", exact: true }).click();
  const presentation = page.locator(".presentation-mode");
  await presentation
    .getByRole("button", { name: "Fullscreen diagram", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Close fullscreen diagram" })
    .click();
  await expect(presentation).toBeVisible();
  await expect(presentation.locator("h1")).toHaveText(
    "From checkout to doorstep.",
  );
  await page.keyboard.press("Escape");
  // Browser-fullscreen denied: the diagram still fills the page and Escape closes it.
  await page.evaluate(() => {
    document.documentElement.requestFullscreen = () =>
      Promise.reject(new Error("Unavailable"));
  });
  await canvas
    .getByRole("button", { name: "Fullscreen diagram", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("Next reveals code before navigating and Back reverses each reveal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Slide 8: A workflow/ }).click();
  const canvas = page.locator(".canvas-frame");
  await expect(canvas.locator(".code-panel")).toContainText("name: Branch CI");
  await expect(canvas.locator(".code-panel")).not.toContainText("branches:");
  await page.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(canvas.locator(".code-panel")).toContainText("branches:");
  await expect(canvas.locator("h1")).toHaveText(
    "A workflow, revealed line by line.",
  );
  await page
    .getByRole("button", { name: "Previous slide", exact: true })
    .click();
  await expect(canvas.locator(".code-panel")).not.toContainText("branches:");
  await page.getByRole("button", { name: "Present", exact: true }).click();
  const presentation = page.locator(".presentation-mode");
  await page.keyboard.press("ArrowRight");
  await expect(presentation.locator(".code-panel")).toContainText("branches:");
  await presentation.getByLabel("Revealed code").click();
  await expect(presentation.locator(".code-panel")).toContainText(
    "runs-on: ubuntu-latest",
  );
  await presentation.getByRole("button", { name: "Restart reveal" }).click();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await expect(presentation.locator(".code-panel")).toContainText(
    "npm run build",
  );
  await expect(
    presentation.getByRole("button", { name: "Reveal next step" }),
  ).toBeDisabled();
  await page.keyboard.press("ArrowRight");
  await expect(presentation.locator("h1")).toHaveText(
    "Let’s make\nsomething matter.",
  );
});

test("React Flow reveals forward and backward, pans, zooms and supports fullscreen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Slide 7: From commit/ }).click();
  const canvas = page.locator(".canvas-frame");
  const nodes = canvas.locator(".react-flow__node");
  await expect(nodes).toHaveCount(1);
  await expect(nodes).toContainText("Developer");
  await page.keyboard.press("ArrowRight");
  await expect(nodes).toHaveCount(2);
  await page.keyboard.press("ArrowLeft");
  await expect(nodes).toHaveCount(1);
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 1 / 9");
  await page.keyboard.press("ArrowRight");
  await canvas
    .locator(".react-flow__pane")
    .click({ position: { x: 20, y: 20 } });
  await expect(nodes).toHaveCount(3);
  await canvas.locator(".flow-viewport").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(nodes).toHaveCount(2);
  const vp = canvas.locator(".flow-viewport");
  const box = (await vp.boundingBox())!;
  const transform = canvas.locator(".react-flow__viewport");
  const previous = await transform.getAttribute("style");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await expect(transform).not.toHaveAttribute("style", previous!);
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 2 / 9");
  const zoom = canvas.getByLabel("Flowchart zoom");
  await canvas.getByRole("button", { name: "Fit flowchart" }).click();
  await page.waitForTimeout(400);
  const previousZoom = await zoom.textContent();
  await canvas.getByRole("button", { name: "Zoom in flowchart" }).click();
  await expect(zoom).not.toHaveText(previousZoom!);
  await canvas
    .getByRole("button", { name: "Fullscreen flowchart", exact: true })
    .click();
  const fullscreen = page.getByRole("dialog", { name: "Fullscreen flowchart" });
  await page.keyboard.press("ArrowRight");
  await expect(fullscreen.locator(".react-flow__node")).toHaveCount(3);
  await expectFlowFitted(fullscreen);
  await page.keyboard.press("ArrowLeft");
  await expect(fullscreen.locator(".react-flow__node")).toHaveCount(2);
  await fullscreen.getByRole("button", { name: "Reveal next step" }).click();
  await expect(fullscreen.locator(".react-flow__node")).toHaveCount(3);
  await fullscreen
    .getByRole("button", { name: "Close fullscreen flowchart" })
    .click();
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 3 / 9");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await expect(nodes).toHaveCount(9);
  await expect(canvas.locator(".react-flow__edge")).toHaveCount(8);
  await expectFlowFitted(canvas);
  await canvas.getByRole("button", { name: "Fit flowchart" }).click();
  await page.screenshot({ path: "/tmp/folio-react-flow.png", fullPage: true });
  await page.getByRole("button", { name: "Present", exact: true }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.locator(".presentation-mode .react-flow__node"),
  ).toHaveCount(8);
  await page.keyboard.press("ArrowRight");
  await expect(
    page.locator(".presentation-mode .react-flow__node"),
  ).toHaveCount(9);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas.locator(".flow-viewport")).toBeVisible();
  await expectFlowFitted(canvas);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});

test("legacy reference flow migrates to React Flow and invalid graph JSON is rejected", async ({
  page,
}) => {
  const legacy = JSON.parse(readFileSync("tests/fixtures/legacy-github-actions.json", "utf8"));
  await page.addInitScript(
    (deck) => localStorage.setItem("folio-deck", JSON.stringify(deck)),
    legacy,
  );
  await page.goto("/");
  await expect(page.locator(".canvas-frame .react-flow__node")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".canvas-frame .react-flow__node")).toHaveCount(2);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".canvas-frame .react-flow__node")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
  const json = page.getByRole("textbox", { name: "Deck JSON" });
  const deck = JSON.parse(await json.inputValue());
  expect(deck.slides[0].layout).toBe("flowchart");
  expect(deck.slides[0].advanceKey).toBeUndefined();
  deck.slides[0].flow.edges[0].target = "missing-node";
  await json.fill(JSON.stringify(deck));
  await page.getByRole("button", { name: "Apply changes" }).click();
  await expect(page.locator(".modal").getByRole("alert")).toContainText(
    "edges referencing those nodes",
  );
});

test("legacy left-advance flag no longer reverses Mermaid keyboard behavior", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "folio-deck",
      JSON.stringify({
        name: "Sequence",
        theme: "editorial",
        slides: [
          {
            id: "s",
            layout: "diagram",
            title: "Sequence",
            eyebrow: "",
            description: "",
            notes: "",
            advanceKey: "left",
            steps: [
              { label: "One", mermaid: "sequenceDiagram\n A->>B: First" },
              {
                label: "Two",
                mermaid: "sequenceDiagram\n A->>B: First\n B->>C: Second",
              },
            ],
          },
        ],
      }),
    ),
  );
  await page.goto("/");
  const canvas = page.locator(".canvas-frame");
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 1 / 2");
  await page.keyboard.press("ArrowRight");
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 2 / 2");
  await page.keyboard.press("ArrowLeft");
  await expect(canvas.locator(".reveal-caption")).toContainText("Step 1 / 2");
  await expect(canvas.locator(".diagram-svg svg")).toBeVisible();
  await canvas
    .getByRole("button", { name: "Fullscreen diagram", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Fullscreen diagram" });
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".reveal-caption")).toContainText("Step 2 / 2");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator(".reveal-caption")).toContainText("Step 1 / 2");
});
