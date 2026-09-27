import { ApiError, handle, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
import * as direct from "@/app/api/slides/[slideId]/route";
export const runtime = "nodejs";
type Context = { params: Promise<{ projectId: string; slideId: string }> };
async function scoped(
  request: Request,
  context: Context,
  method: "GET" | "PUT" | "PATCH" | "DELETE",
) {
  return handle(async () => {
    const { projectId, slideId } = await context.params;
    const project = uuid(projectId),
      slide = uuid(slideId);
    const { rowCount } = await (
      await ready()
    ).query("SELECT 1 FROM slides WHERE id=$1 AND project_id=$2", [
      slide,
      project,
    ]);
    if (!rowCount)
      throw new ApiError(404, "NOT_FOUND", "Slide not found in this project.");
    return direct[method](request, {
      params: Promise.resolve({ slideId: slide }),
    });
  });
}
export async function GET(request: Request, context: Context) {
  return scoped(request, context, "GET");
}
export async function PUT(request: Request, context: Context) {
  return scoped(request, context, "PUT");
}
export async function PATCH(request: Request, context: Context) {
  return scoped(request, context, "PATCH");
}
export async function DELETE(request: Request, context: Context) {
  return scoped(request, context, "DELETE");
}
