import { ZodError, type ZodType } from "zod";
import { ready } from "./db";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function body<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  const raw = await request.text();
  if (raw.length > 2_000_000)
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "JSON body exceeds 2 MB.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(json);
}
export function result(data: unknown, status = 200) {
  return Response.json(
    { data },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function revisionTag(id: string, revision: string | number) {
  return `"${id}:${revision}"`;
}
export function taggedResult(data: unknown, etag: string) {
  return Response.json(
    { data },
    { headers: { "Cache-Control": "no-store", ETag: etag } },
  );
}
export function notModified(etag: string) {
  return new Response(null, {
    status: 304,
    headers: { "Cache-Control": "no-store", ETag: etag },
  });
}
export async function handle<T>(
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Slide or project JSON is invalid.",
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
        },
        { status: 422 },
      );
    if (error instanceof ApiError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    const pg = error as { code?: string };
    if (pg?.code === "23505")
      return Response.json(
        {
          error: {
            code: "CONFLICT",
            message: "A slide with that id already exists in this project.",
          },
        },
        { status: 409 },
      );
    if (pg?.code === "23503")
      return Response.json(
        { error: { code: "NOT_FOUND", message: "Project does not exist." } },
        { status: 404 },
      );
    console.error("Database operation failed", error);
    return Response.json(
      {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message:
            "PostgreSQL is unavailable. Check DATABASE_URL and the database service.",
        },
      },
      { status: 503 },
    );
  }
}
export async function projectExists(id: string) {
  const r = await (
    await ready()
  ).query("SELECT id FROM projects WHERE id = $1", [id]);
  if (!r.rowCount) throw new ApiError(404, "NOT_FOUND", "Project not found.");
}
export function uuid(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    throw new ApiError(400, "INVALID_ID", "Expected a UUID.");
  return id;
}
