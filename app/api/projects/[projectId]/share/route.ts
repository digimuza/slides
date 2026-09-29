import { ApiError, handle, result, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
import { createShareSlug } from "@/lib/share-slug";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const db = await ready();
    const project = await db.query<{ name: string }>("SELECT name FROM projects WHERE id = $1", [id]);
    if (!project.rows[0]) throw new ApiError(404, "NOT_FOUND", "Project not found.");
    for (let attempt = 0; attempt < 5; attempt++) {
      const { rows } = await db.query<{ share_slug: string }>(
        `UPDATE projects SET share_slug = COALESCE(share_slug, $2)
         WHERE id = $1 RETURNING share_slug`,
        [id, createShareSlug(project.rows[0].name)],
      ).catch((error: { code?: string }) => {
        if (error.code === "23505") return { rows: [] };
        throw error;
      });
      if (rows[0]) return result({ slug: rows[0].share_slug, path: `/s/${rows[0].share_slug}` });
      const exists = await db.query("SELECT 1 FROM projects WHERE id = $1", [id]);
      if (!exists.rowCount) throw new ApiError(404, "NOT_FOUND", "Project not found.");
    }
    throw new ApiError(503, "SLUG_UNAVAILABLE", "Could not create a unique share link. Try again.");
  });
}
