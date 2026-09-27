import { test, expect } from "@playwright/test";
import { sampleDeck } from "../lib/deck";

test("projects and slides support REST CRUD with strict JSON validation", async ({
  request,
}) => {
  const created = await request.post("/api/projects", {
    data: { name: "API test project", theme: "editorial" },
  });
  expect(created.status()).toBe(201);
  const project = (await created.json()).data;
  try {
    const invalidSyntax = await request.post(
      `/api/projects/${project.id}/slides`,
      {
        headers: { "Content-Type": "application/json" },
        data: Buffer.from("{oops"),
      },
    );
    expect(invalidSyntax.status()).toBe(400);
    const missing = await request.post(`/api/projects/${project.id}/slides`, {
      data: { id: "bad", title: "Incomplete" },
    });
    expect(missing.status()).toBe(422);
    expect(
      (await missing.json()).error.issues.some(
        (i: { path: string }) => i.path === "layout",
      ),
    ).toBeTruthy();
    const extra = await request.post(`/api/projects/${project.id}/slides`, {
      data: { ...sampleDeck.slides[0], madeUp: true },
    });
    expect(extra.status()).toBe(422);
    const invalidFlow = await request.post(
      `/api/projects/${project.id}/slides`,
      {
        data: {
          ...sampleDeck.slides[6],
          id: "bad-flow",
          flow: {
            ...sampleDeck.slides[6].flow,
            edges: [{ id: "x", source: "developer", target: "unknown" }],
          },
        },
      },
    );
    expect(invalidFlow.status()).toBe(422);
    const added = await request.post(`/api/projects/${project.id}/slides`, {
      data: { ...sampleDeck.slides[0], id: "api-cover", title: "First slide" },
    });
    expect(added.status()).toBe(201);
    const slide = (await added.json()).data;
    expect(slide.projectId).toBe(project.id);
    expect(slide.content.title).toBe("First slide");
    expect(
      (
        await request.post(`/api/projects/${project.id}/slides`, {
          data: { ...sampleDeck.slides[0], id: "api-cover" },
        })
      ).status(),
    ).toBe(409);
    const scoped = await request.get(
      `/api/projects/${project.id}/slides/${slide.id}`,
    );
    expect(scoped.status()).toBe(200);
    const got = await request.get(`/api/slides/${slide.id}`);
    expect((await got.json()).data.title).toBe("First slide");
    const patched = await request.patch(`/api/slides/${slide.id}`, {
      data: { title: "Updated title", notes: "New notes" },
    });
    expect(patched.status()).toBe(200);
    expect((await patched.json()).data.content.notes).toBe("New notes");
    const scopedPatch = await request.patch(
      `/api/projects/${project.id}/slides/${slide.id}`,
      { data: { description: "Scoped update" } },
    );
    expect(scopedPatch.status()).toBe(200);
    expect((await scopedPatch.json()).data.content.description).toBe(
      "Scoped update",
    );
    const invalidPatch = await request.patch(`/api/slides/${slide.id}`, {
      data: { layout: "flowchart" },
    });
    expect(invalidPatch.status()).toBe(422);
    expect(
      (await (await request.get(`/api/slides/${slide.id}`)).json()).data.layout,
    ).toBe("cover");
    const replaced = await request.put(`/api/slides/${slide.id}`, {
      data: { ...sampleDeck.slides[1], id: "api-cover" },
    });
    expect(replaced.status()).toBe(200);
    expect((await replaced.json()).data.layout).toBe("statement");
    const all = await request.get("/api/slides");
    expect(
      (await all.json()).data.some(
        (s: { id: string; title: string }) =>
          s.id === slide.id && s.title === sampleDeck.slides[1].title,
      ),
    ).toBeTruthy();
    const listing = await request.get(`/api/projects/${project.id}/slides`);
    expect((await listing.json()).data).toHaveLength(1);
    const missingSlide = await request.get(
      `/api/slides/${crypto.randomUUID()}`,
    );
    expect(missingSlide.status()).toBe(404);
    expect((await request.get("/api/slides/not-a-uuid")).status()).toBe(400);
    expect((await request.delete(`/api/slides/${slide.id}`)).status()).toBe(
      204,
    );
    expect((await request.get(`/api/slides/${slide.id}`)).status()).toBe(404);
  } finally {
    expect((await request.delete(`/api/projects/${project.id}`)).status()).toBe(
      204,
    );
  }
});

test("deck save is atomic, reuses slide links, and stores project theme and order", async ({
  request,
}) => {
  const project = (
    await (
      await request.post("/api/projects", {
        data: { name: "Deck test", theme: "editorial" },
      })
    ).json()
  ).data;
  try {
    const first = {
      name: "CI presentation",
      theme: "midnight",
      slides: [sampleDeck.slides[6], sampleDeck.slides[7]],
    };
    const saved = await request.put(`/api/projects/${project.id}/deck`, {
      data: first,
    });
    expect(saved.status()).toBe(200);
    expect((await saved.json()).data.savedSlides).toBe(2);
    const before = (
      await (await request.get(`/api/projects/${project.id}/slides`)).json()
    ).data;
    const bad = {
      ...first,
      slides: [
        first.slides[0],
        {
          ...first.slides[1],
          steps: [{ label: "Wrong", mermaid: "flowchart LR\n A-->B" }],
        },
      ],
    };
    expect(
      (
        await request.put(`/api/projects/${project.id}/deck`, { data: bad })
      ).status(),
    ).toBe(422);
    expect(
      (await (await request.get(`/api/projects/${project.id}/slides`)).json())
        .data,
    ).toHaveLength(2);
    const second = {
      ...first,
      slides: first.slides.map((s, i) =>
        i === 0 ? { ...s, title: "Renamed flowchart" } : s,
      ),
    };
    expect(
      (
        await request.put(`/api/projects/${project.id}/deck`, { data: second })
      ).status(),
    ).toBe(200);
    const after = (
      await (await request.get(`/api/projects/${project.id}/slides`)).json()
    ).data;
    expect(after.map((s: { id: string }) => s.id)).toEqual(
      before.map((s: { id: string }) => s.id),
    );
    expect(after[0].title).toBe("Renamed flowchart");
    const deck = (
      await (await request.get(`/api/projects/${project.id}/deck`)).json()
    ).data;
    expect(deck.theme).toBe("midnight");
    expect(deck.slides.map((s: { id: string }) => s.id)).toEqual(
      first.slides.map((s) => s.id),
    );
    const p = (await (await request.get(`/api/projects/${project.id}`)).json())
      .data;
    expect(p.slideCount).toBe(2);
    expect(p.theme).toBe("midnight");
    expect(
      (
        await request.patch(`/api/projects/${project.id}`, {
          data: { name: "Renamed project" },
        })
      ).status(),
    ).toBe(200);
  } finally {
    await request.delete(`/api/projects/${project.id}`);
  }
});

test("editor saves a project and library links update one slide", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Save to project" }).click();
  await page
    .getByRole("textbox", { name: "Project name" })
    .fill("Library UI test");
  await page.getByRole("button", { name: "Save slides" }).click();
  await expect(page.getByRole("status")).toContainText(
    "slides saved to PostgreSQL",
  );
  const project = (await (await request.get("/api/projects")).json()).data.find(
    (p: { name: string }) => p.name === "Library UI test",
  );
  expect(project.slideCount).toBe(sampleDeck.slides.length);
  try {
    const slides = (
      await (await request.get(`/api/projects/${project.id}/slides`)).json()
    ).data;
    const target = slides[0];
    const card = page.locator(
      `a[href="/library/projects/${project.id}/slides/${target.id}"]`,
    );
    await expect(card).toBeVisible();
    await card.click();
    await expect(
      page
        .getByRole("heading", { name: target.title.replace(/\n/g, " ") })
        .first(),
    ).toBeVisible();
    const source = page.getByRole("textbox", { name: "Slide JSON" });
    const content = JSON.parse(await source.inputValue());
    content.title = "A title updated through the library";
    await source.fill(JSON.stringify(content, null, 2));
    await page.getByRole("button", { name: "Save slide" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Slide saved to PostgreSQL",
    );
    expect(
      (await (await request.get(`/api/slides/${target.id}`)).json()).data.title,
    ).toBe(content.title);
    await page.getByRole("link", { name: "All slides" }).click();
    await expect(
      page.getByRole("link", { name: /A title updated through the library/ }),
    ).toBeVisible();
    await page.locator(`a[href="/?project=${project.id}"]`).first().click();
    await expect(page.locator(".canvas-frame h1")).toHaveText(
      "A title updated through the library",
    );
    await page.reload();
    await expect(page.locator(".canvas-frame h1")).toHaveText(
      "A title updated through the library",
    );
  } finally {
    await request.delete(`/api/projects/${project.id}`);
  }
});
