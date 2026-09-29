import { expect, test } from "@playwright/test";

test("share links are unique, read-only, and show the latest saved deck", async ({ page, request }) => {
  const projects: string[] = [];
  try {
    for (let index = 0; index < 2; index++) {
      const created = await request.post("/api/projects", { data: { name: "Coolify presentation", theme: "first-horizon" } });
      expect(created.status()).toBe(201);
      projects.push((await created.json()).data.id);
      const saved = await request.put(`/api/projects/${projects[index]}/deck`, { data: {
        name: "Coolify presentation", theme: "first-horizon", slides: [{
          id: "cover", layout: "cover", eyebrow: "COOLIFY", title: `Shared deck ${index}`,
          description: "View this deck without editor controls.", notes: "Presenter-only note.",
        }],
      } });
      expect(saved.ok()).toBe(true);
    }

    const first = await request.post(`/api/projects/${projects[0]}/share`);
    const second = await request.post(`/api/projects/${projects[1]}/share`);
    expect(first.ok()).toBe(true);
    expect(second.ok()).toBe(true);
    const firstPath: string = (await first.json()).data.path;
    const secondPath: string = (await second.json()).data.path;
    expect(firstPath).toMatch(/^\/s\/coolify-[a-f0-9]{6}$/);
    expect(secondPath).not.toBe(firstPath);
    expect((await (await request.post(`/api/projects/${projects[0]}/share`)).json()).data.path).toBe(firstPath);

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(firstPath);
    await expect(page.getByRole("heading", { name: "Shared deck 0" })).toBeVisible();
    await expect(page.getByText("View only")).toBeAttached();
    const canvas = await page.locator(".shared-viewer-canvas").boundingBox();
    expect(canvas?.x).toBeCloseTo(0, 0);
    expect(canvas?.y).toBeCloseTo(0, 0);
    expect(canvas?.width).toBeCloseTo(1280, 0);
    expect(canvas?.height).toBeCloseTo(720, 0);
    await expect(page.getByRole("button", { name: "Next slide" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit JSON" })).toHaveCount(0);
    await expect(page.getByText("Presenter-only note.")).toHaveCount(0);
    expect(await (await request.get(firstPath)).text()).not.toContain("Presenter-only note.");

    const updated = await request.put(`/api/projects/${projects[0]}/deck`, { data: {
      name: "Coolify presentation", theme: "first-horizon", slides: [{
        id: "cover", layout: "cover", eyebrow: "COOLIFY", title: "Updated shared deck",
        description: "Fresh content on the same link.", notes: "Private presenter note.",
      }],
    } });
    expect(updated.ok()).toBe(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Updated shared deck" })).toBeVisible();
    expect((await request.get("/s/unknown-000000")).status()).toBe(404);
  } finally {
    for (const id of projects) await request.delete(`/api/projects/${id}`);
  }
});
