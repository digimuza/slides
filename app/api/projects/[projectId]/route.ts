import { ApiError, body, handle, result, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
import { projectPatchSchema } from "@/lib/slide-schema";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };
export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const { rows } = await (
      await ready()
    ).query(
      `SELECT p.id,p.name,p.theme,p.created_at AS "createdAt",p.updated_at AS "updatedAt",COUNT(s.id)::int AS "slideCount" FROM projects p LEFT JOIN slides s ON s.project_id=p.id WHERE p.id=$1 GROUP BY p.id`,
      [id],
    );
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "Project not found.");
    return result(rows[0]);
  });
}
export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const input = await body(req, projectPatchSchema);
    const { rows } = await (
      await ready()
    ).query(
      `UPDATE projects SET name=COALESCE($2,name),theme=COALESCE($3,theme),revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING id,name,theme,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [id, input.name ?? null, input.theme ?? null],
    );
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "Project not found.");
    return result(rows[0]);
  });
}
export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const { rowCount } = await (
      await ready()
    ).query("DELETE FROM projects WHERE id=$1", [id]);
    if (!rowCount) throw new ApiError(404, "NOT_FOUND", "Project not found.");
    return new Response(null, { status: 204 });
  });
}
