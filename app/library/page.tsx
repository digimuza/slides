import LibraryPreview from "@/components/library-preview";
import { Layers, ArrowLeft } from "lucide-react";
export const metadata = { title: "Slide library · Folio" };
export default function LibraryPage() {
  return (
    <div className="library-page">
      <header className="library-top">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Layers size={20} />
          </span>
          folio<span className="brand-period">.</span>
        </a>
        <a href="/">
          <ArrowLeft size={15} /> Create a slide
        </a>
      </header>
      <LibraryPreview full />
    </div>
  );
}
