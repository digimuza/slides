import * as deck from "@/app/api/projects/[projectId]/deck/route";

export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  const response = await deck.GET(request, context);
  if (!response.ok) return response;
  const { projectId } = await context.params;
  const payload = await response.json();
  return new Response(JSON.stringify(payload.data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="project-${projectId}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
