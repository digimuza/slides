import { ApiError, body, handle, notModified, revisionTag, taggedResult, uuid } from "@/lib/api";
import { ready, transaction } from "@/lib/db";
import { deckSchema } from "@/lib/slide-schema";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ projectId: string }> };
export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const db = await ready();
    const project = await db.query(
      `SELECT p.name,p.theme,p.revision,
        COALESCE(jsonb_agg(s.content ORDER BY s.position,s.created_at,s.id)
          FILTER (WHERE s.id IS NOT NULL),'[]'::jsonb) AS slides
       FROM projects p LEFT JOIN slides s ON s.project_id=p.id
       WHERE p.id=$1 GROUP BY p.id`,
      [id],
    );
    if (!project.rows[0])
      throw new ApiError(404, "NOT_FOUND", "Project not found.");
    const etag = revisionTag(id, project.rows[0].revision);
    if (req.headers.get("if-none-match") === etag) return notModified(etag);
    return taggedResult({
      name: project.rows[0].name,
      theme: project.rows[0].theme,
      slides: project.rows[0].slides,
    }, etag);
  });
}
export async function PUT(req: Request, ctx: Ctx) {
  return handle(async () => {
    const id = uuid((await ctx.params).projectId);
    const deck = await body(req, deckSchema);
    const revision = await transaction(async (client) => {
      const existing = await client.query("SELECT revision FROM projects WHERE id=$1 FOR UPDATE", [id]);
      if (!existing.rowCount) throw new ApiError(404, "NOT_FOUND", "Project not found.");
      const expected = req.headers.get("if-match");
      if (expected && expected !== revisionTag(id, existing.rows[0].revision))
        throw new ApiError(409, "STALE_REVISION", "This project changed elsewhere. Load the latest version before saving.");
      const project = await client.query(
        "UPDATE projects SET name=$2,theme=$3,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING id",
        [id, deck.name, deck.theme],
      );
      if (!project.rowCount)
        throw new ApiError(404, "NOT_FOUND", "Project not found.");
      for (const [index, slide] of deck.slides.entries())
        await client.query(
          `INSERT INTO slides(id,project_id,source_id,title,layout,position,content) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(project_id,source_id) DO UPDATE SET title=EXCLUDED.title,layout=EXCLUDED.layout,position=EXCLUDED.position,content=EXCLUDED.content,revision=slides.revision+1,updated_at=clock_timestamp()`,
          [
            crypto.randomUUID(),
            id,
            slide.id,
            slide.title,
            slide.layout,
            index,
            JSON.stringify(slide),
          ],
        );
      const final = await client.query("SELECT revision FROM projects WHERE id=$1", [id]);
      return final.rows[0].revision as string;
    });
    return taggedResult({ projectId: id, savedSlides: deck.slides.length }, revisionTag(id, revision));
  });
}
