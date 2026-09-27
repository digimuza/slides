import { Pool, type PoolClient } from "pg";

const globalDb = globalThis as typeof globalThis & {
  folioPool?: Pool;
  folioSchemaReady?: Promise<void>;
};
export function database(): Pool {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!globalDb.folioPool)
    globalDb.folioPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 4000,
      idleTimeoutMillis: 30_000,
    });
  return globalDb.folioPool;
}
export async function ready(): Promise<Pool> {
  const pool = database();
  if (!globalDb.folioSchemaReady) {
    globalDb.folioSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY,
          name VARCHAR(160) NOT NULL,
          theme VARCHAR(20) NOT NULL DEFAULT 'editorial',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS slides (
          id UUID PRIMARY KEY,
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          source_id VARCHAR(120) NOT NULL,
          title VARCHAR(2000) NOT NULL,
          layout VARCHAR(30) NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          content JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(project_id, source_id)
        );
        CREATE INDEX IF NOT EXISTS slides_project_position_idx ON slides(project_id, position, created_at);
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;
        ALTER TABLE slides ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;
        CREATE OR REPLACE FUNCTION folio_touch_project() RETURNS trigger AS $$
        BEGIN
          UPDATE projects SET revision = revision + 1, updated_at = clock_timestamp()
          WHERE id = COALESCE(NEW.project_id, OLD.project_id);
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS folio_slide_changed ON slides;
        CREATE TRIGGER folio_slide_changed AFTER INSERT OR UPDATE OR DELETE ON slides
          FOR EACH ROW EXECUTE FUNCTION folio_touch_project();
      `);
    })().catch((err) => {
      globalDb.folioSchemaReady = undefined;
      throw err;
    });
  }
  await globalDb.folioSchemaReady;
  return pool;
}
export async function transaction<T>(
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await (await ready()).connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
