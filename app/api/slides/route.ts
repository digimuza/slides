import { handle, result, uuid } from "@/lib/api";
import { ready } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req: Request) {
  return handle(async () => {
    const filter = new URL(req.url).searchParams.get("projectId");
    const id = filter ? uuid(filter) : null;
    const { rows } = await (
      await ready()
    ).query(
      `SELECT s.id,s.project_id AS "projectId",p.name AS "projectName",s.source_id AS "sourceId",s.title,s.layout,s.position,s.created_at AS "createdAt",s.updated_at AS "updatedAt" FROM slides s JOIN projects p ON p.id=s.project_id WHERE ($1::uuid IS NULL OR s.project_id=$1::uuid) ORDER BY p.name,s.position,s.created_at`,
      [id],
    );
    return result(rows);
  });
}
