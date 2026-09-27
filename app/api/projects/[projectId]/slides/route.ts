import { body, handle, projectExists, result, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
import { slideSchema } from "@/lib/slide-schema";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };
export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    await projectExists(id);
    const { rows } = await (
      await ready()
    ).query(
      `SELECT id,project_id AS "projectId",source_id AS "sourceId",title,layout,position,content,created_at AS "createdAt",updated_at AS "updatedAt" FROM slides WHERE project_id=$1 ORDER BY position,created_at,id`,
      [id],
    );
    return result(rows);
  });
}
export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const slide = await body(req, slideSchema);
    await projectExists(id);
    const { rows } = await (
      await ready()
    ).query(
      `INSERT INTO slides(id,project_id,source_id,title,layout,position,content) VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(position)+1,0) FROM slides WHERE project_id=$2),$6::jsonb) RETURNING id,project_id AS "projectId",source_id AS "sourceId",title,layout,position,content,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [
        crypto.randomUUID(),
        id,
        slide.id,
        slide.title,
        slide.layout,
        JSON.stringify(slide),
      ],
    );
    return result(rows[0], 201);
  });
}
