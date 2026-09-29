import * as slide from "@/app/api/projects/[projectId]/slides/[slideId]/route";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; slideId: string }> };

export async function GET(request: Request, context: Context) {
  const response = await slide.GET(request, context);
  if (!response.ok) return response;
  const { slideId } = await context.params;
  const payload = await response.json();
  return new Response(JSON.stringify(payload.data.content, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="slide-${slideId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
