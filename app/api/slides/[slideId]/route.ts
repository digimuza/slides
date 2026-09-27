import { ApiError, body, handle, notModified, revisionTag, taggedResult, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
import { slideSchema, slidePatchSchema } from "@/lib/slide-schema";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ slideId: string }> };
const select = `SELECT id,project_id AS "projectId",source_id AS "sourceId",title,layout,position,content,revision,created_at AS "createdAt",updated_at AS "updatedAt" FROM slides WHERE id=$1`;
async function current(id: string) {
  const { rows } = await (await ready()).query(select, [id]);
  if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "Slide not found.");
  return rows[0];
}
async function update(id: string, slide: unknown, expected?: string) {
  const valid = slideSchema.parse(slide);
  const { rows } = await (
    await ready()
  ).query(
    `UPDATE slides SET source_id=$2,title=$3,layout=$4,content=$5::jsonb,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 AND ($6::bigint IS NULL OR revision=$6::bigint) RETURNING id,project_id AS "projectId",source_id AS "sourceId",title,layout,position,content,revision,created_at AS "createdAt",updated_at AS "updatedAt"`,
    [id, valid.id, valid.title, valid.layout, JSON.stringify(valid), expected ?? null],
  );
  if (!rows[0]) {
    await current(id);
    throw new ApiError(409, "STALE_REVISION", "This slide changed elsewhere. Load the latest version before saving.");
  }
  return taggedResult(rows[0], revisionTag(id, rows[0].revision));
}
export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).slideId);
    const slide = await current(id);
    const etag = revisionTag(id, slide.revision);
    return req.headers.get("if-none-match") === etag
      ? notModified(etag)
      : taggedResult(slide, etag);
  });
}
export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).slideId);
    const slide = await body(req, slideSchema);
    const expected = req.headers.get("if-match");
    if (expected) {
      const existing = await current(id);
      if (expected !== revisionTag(id, existing.revision))
        throw new ApiError(409, "STALE_REVISION", "This slide changed elsewhere. Load the latest version before saving.");
      return update(id, slide, existing.revision);
    }
    return update(id, slide);
  });
}
export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).slideId);
    const changes = await body(req, slidePatchSchema);
    const slide = await current(id);
    const expected = req.headers.get("if-match");
    if (expected && expected !== revisionTag(id, slide.revision))
      throw new ApiError(409, "STALE_REVISION", "This slide changed elsewhere. Load the latest version before saving.");
    return update(id, { ...slide.content, ...changes }, slide.revision);
  });
}
export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).slideId);
    const { rowCount } = await (
      await ready()
    ).query("DELETE FROM slides WHERE id=$1", [id]);
    if (!rowCount) throw new ApiError(404, "NOT_FOUND", "Slide not found.");
    return new Response(null, { status: 204 });
  });
}
