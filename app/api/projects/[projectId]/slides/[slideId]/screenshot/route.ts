import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
import * as slide from "@/app/api/projects/[projectId]/slides/[slideId]/route";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; slideId: string }> };
let activeScreenshots = 0;

export async function GET(request: Request, context: Context) {
  const checked = await slide.GET(request, context);
  if (!checked.ok) return checked;
  if (activeScreenshots >= 2)
    return Response.json({ error: { code: "SCREENSHOT_BUSY", message: "Try the screenshot again shortly." } }, { status: 429 });
  const saved = await checked.json();
  const layout: string = saved.data.content.layout;
  const { projectId, slideId } = await context.params;
  const port = new URL(request.url).port || process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/library/projects/${projectId}/slides/${slideId}`;
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath = process.env.CHROMIUM_PATH ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" :
      existsSync(macChrome) ? macChrome : chromium.executablePath());
  let browser;
  activeScreenshots += 1;
  try {
    browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, reducedMotion: "reduce" });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const canvas = page.locator(".detail-preview .slide-canvas");
    await canvas.waitFor({ state: "visible", timeout: 20_000 });
    if (layout === "diagram")
      await page.locator(".detail-preview .diagram-svg svg, .detail-preview .diagram-error").first().waitFor({ timeout: 20_000 });
    if (layout === "flowchart")
      await page.locator(".detail-preview .react-flow__node").first().waitFor({ timeout: 20_000 });
    if (layout === "chart")
      await page.locator(".detail-preview .native-chart svg").first().waitFor({ timeout: 20_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (img) => img.decode().catch(() => {})));
    });
    const image = await canvas.screenshot({ type: "png", animations: "disabled", timeout: 20_000 });
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="slide-${slideId}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Slide screenshot failed", error);
    return Response.json({ error: { code: "SCREENSHOT_FAILED", message: "Could not capture this slide." } }, { status: 500 });
  } finally {
    await browser?.close();
    activeScreenshots -= 1;
  }
}
