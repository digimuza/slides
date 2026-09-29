import { randomBytes } from "node:crypto";

export function createShareSlug(name: string): string {
  const word = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/)?.[0] || "slides";
  return `${word.slice(0, 48)}-${randomBytes(3).toString("hex")}`;
}
