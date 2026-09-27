import { body, handle, result } from "@/lib/api";
import { ready } from "@/lib/db";
import { projectInputSchema } from "@/lib/slide-schema";
export const runtime = "nodejs";
export async function GET() {
  return handle(async () => {
    const db = await ready();
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.theme, p.created_at AS "createdAt", p.updated_at AS "updatedAt", COUNT(s.id)::int AS "slideCount" FROM projects p LEFT JOIN slides s ON s.project_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC, p.created_at DESC`,
    );
    return result(rows);
  });
}
export async function POST(req: Request) {
  return handle(async () => {
    const input = await body(req, projectInputSchema);
    const db = await ready();
    const { rows } = await db.query(
      `INSERT INTO projects(id,name,theme) VALUES($1,$2,$3) RETURNING id,name,theme,created_at AS "createdAt",updated_at AS "updatedAt"`,
      [crypto.randomUUID(), input.name, input.theme],
    );
    return result(rows[0], 201);
  });
}
