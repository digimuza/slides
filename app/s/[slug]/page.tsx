import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ready } from "@/lib/db";
import { deckSchema } from "@/lib/slide-schema";
import SharedPresentation from "@/components/shared-presentation";

export default async function SharedDeck({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  if (!/^[a-z0-9]+-[a-f0-9]{6}$/.test(slug)) notFound();
  const db = await ready();
  const { rows } = await db.query(
    `SELECT p.name, p.theme,
      COALESCE(jsonb_agg(s.content ORDER BY s.position,s.created_at,s.id)
        FILTER (WHERE s.id IS NOT NULL),'[]'::jsonb) AS slides
     FROM projects p LEFT JOIN slides s ON s.project_id = p.id
     WHERE p.share_slug = $1 GROUP BY p.id`,
    [slug],
  );
  if (!rows[0]) notFound();
  const parsed = deckSchema.safeParse(rows[0]);
  if (!parsed.success) notFound();
  return <SharedPresentation deck={{
    ...parsed.data,
    slides: parsed.data.slides.map(({ notes: _notes, ...slide }) => ({ ...slide, notes: "" })),
  }} />;
}
