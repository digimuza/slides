import SlideDetail from "@/components/slide-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; slideId: string }>;
}) {
  const { projectId, slideId } = await params;
  return <SlideDetail projectId={projectId} slideId={slideId} />;
}
