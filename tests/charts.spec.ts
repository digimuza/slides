import { test, expect } from "@playwright/test";
import { chartTemplates } from "../lib/chart-templates";
import { chartSchema } from "../lib/chart-schema";
import { slideSchema, slidePatchSchema } from "../lib/slide-schema";
import { parseDeck } from "../lib/deck";

for (const template of chartTemplates) {
  test(`${template.name} renders, edits and round trips`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add slide", exact: true }).click();
    await page.getByRole("button", { name: template.name }).click();
    const chart = page.locator(".canvas-frame .native-chart");
    await expect(chart.locator("svg").first()).toBeVisible();
    await page.getByRole("button", { name: "Content", exact: true }).click();
    const gantt = template.slide.chart!.type === "gantt";
    await page
      .getByRole("textbox", {
        name: gantt ? "Task 1 name" : "Point 1 label",
        exact: true,
      })
      .fill("Updated label");
    if (!gantt)
      await page
        .getByRole("spinbutton", { name: "Point 1 value", exact: true })
        .fill("99");
    if (gantt) await expect(chart).toContainText("Updated label");
    else await expect(chart).toHaveAttribute("aria-label", /Updated label: 99/);
    for (const theme of ["Midnight", "Botanical", "First Horizon"]) {
      await page.getByRole("button", { name: "Design", exact: true }).click();
      await page.getByRole("button", { name: theme, exact: true }).click();
      await expect(chart.locator("svg").first()).toBeVisible();
    }
    await page.getByRole("button", { name: "Edit JSON", exact: true }).click();
    const json = await page
      .getByRole("textbox", { name: "Deck JSON" })
      .inputValue();
    const deck = parseDeck(json);
    const slide = deck.slides.find((slide) => slide.chart);
    expect(slideSchema.safeParse(slide).success).toBe(true);
    const data = slide!.chart!;
    expect(
      data.type === "gantt" ? data.tasks[0].label : data.data[0].label,
    ).toBe("Updated label");
    if (data.type !== "gantt") expect(data.data[0].value).toBe(99);
    await page.getByRole("button", { name: "Apply changes" }).click();
    await page.reload();
    await expect(
      page.locator(".thumbnail-row .native-chart svg").first(),
    ).toBeVisible();
  });
}

test("chart validation rejects invalid values, dates, and missing data", () => {
  expect(
    chartSchema.safeParse({ type: "pie", data: [{ label: "A", value: -1 }] })
      .success,
  ).toBe(false);
  expect(
    chartSchema.safeParse({ type: "donut", data: [{ label: "A", value: 0 }] })
      .success,
  ).toBe(false);
  expect(
    chartSchema.safeParse({ type: "line", data: [{ label: "A", value: -1 }] })
      .success,
  ).toBe(true);
  for (const [start, end] of [
    ["2026-02-30", "2026-03-05"],
    ["2026-10-10", "2026-10-01"],
  ]) {
    expect(
      chartSchema.safeParse({
        type: "gantt",
        tasks: [{ label: "Task", start, end }],
      }).success,
    ).toBe(false);
  }
  const slide = chartTemplates[0].slide;
  expect(slideSchema.safeParse({ ...slide, chart: undefined }).success).toBe(
    false,
  );
  expect(
    slideSchema.safeParse({ ...slide, steps: [{ label: "Invalid" }] }).success,
  ).toBe(false);
  expect(slidePatchSchema.safeParse({ chart: slide.chart }).success).toBe(true);
  expect(() =>
    parseDeck(
      JSON.stringify({
        name: "Invalid",
        theme: "editorial",
        slides: [{ ...slide, chart: { type: "gantt", tasks: [] } }],
      }),
    ),
  ).toThrow();
});

test("invalid edits show an error and recover without losing the preview", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Add slide", exact: true }).click();
  await page.getByRole("button", { name: "Pie chart" }).click();
  await page.getByRole("button", { name: "Content", exact: true }).click();
  const value = page.getByRole("spinbutton", {
    name: "Point 1 value",
    exact: true,
  });
  await value.fill("-10");
  await expect(page.locator(".chart-editor [role=alert]")).toBeVisible();
  await expect(
    page.locator(".canvas-frame .native-chart svg").first(),
  ).toBeVisible();
  await value.fill("20");
  const label = page.getByLabel("Point 1 label", { exact: true });
  await label.fill("");
  await label.pressSequentially("Two words");
  await expect(label).toHaveValue("Two words");
  await expect(page.locator(".chart-editor [role=alert]")).toHaveCount(0);
  await page.getByLabel("Chart type", { exact: true }).selectOption("bar");
  await expect(page.locator(".canvas-frame .native-chart")).toHaveAttribute(
    "aria-label",
    /bar chart/,
  );
  await page
    .getByRole("button", { name: "Add data point", exact: true })
    .click();
  await expect(page.getByLabel("Point 5 label", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Remove point 5", exact: true })
    .click();
  await expect(page.getByLabel("Point 5 label", { exact: true })).toHaveCount(
    0,
  );
});

test("chart decks persist through the API and render in presentation and library", async ({
  page,
  request,
}) => {
  test.skip(!process.env.DATABASE_URL, "Requires PostgreSQL");
  const created = await request.post("/api/projects", {
    data: { name: "Native charts test" },
  });
  expect(created.status()).toBe(201);
  const project = (await created.json()).data;
  try {
    const deck = {
      name: "Native charts test",
      theme: "editorial",
      slides: chartTemplates.map(({ slide }) => slide),
    };
    const saved = await request.put(`/api/projects/${project.id}/deck`, {
      data: deck,
    });
    expect(saved.ok()).toBe(true);
    const loaded = await request.get(`/api/projects/${project.id}/deck`);
    expect((await loaded.json()).data).toEqual(deck);
    await page.goto(`/?project=${project.id}`);
    await expect(page.locator(".canvas-frame .gantt-chart svg")).toBeVisible();
    await page.getByRole("button", { name: "Present", exact: true }).click();
    await expect(
      page.locator(".presentation-mode .gantt-chart svg"),
    ).toBeVisible();
    await expect(page.locator(".presentation-mode .animated-slide")).toHaveCSS(
      "opacity",
      "1",
    );
    await page.screenshot({ path: "test-results/native-gantt.png" });
    await page.keyboard.press("ArrowRight");
    await expect(
      page.locator(".presentation-mode .recharts-pie"),
    ).toBeVisible();
    await expect(page.locator(".presentation-mode .animated-slide")).toHaveCSS(
      "opacity",
      "1",
    );
    await page.screenshot({ path: "test-results/native-pie.png" });
    await page.keyboard.press("Escape");
    const slides = (
      await (await request.get(`/api/projects/${project.id}/slides`)).json()
    ).data;
    await page.goto(`/library/projects/${project.id}/slides/${slides[1].id}`);
    await expect(page.locator(".native-chart .recharts-pie")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".native-chart .recharts-pie")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await request.delete(`/api/projects/${project.id}`);
  }
});
