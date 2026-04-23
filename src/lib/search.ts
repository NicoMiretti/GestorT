import path from "node:path";
import fs from "node:fs/promises";
import { repoPath, ensureCloned } from "./git";

export type SearchHit = {
  file: string;
  line: number;
  preview: string;
};

export async function searchInRepo(query: string, max = 200): Promise<SearchHit[]> {
  if (!query.trim()) return [];
  await ensureCloned();
  const root = repoPath();
  const re = new RegExp(escapeRegex(query), "i");
  const hits: SearchHit[] = [];

  async function walk(p: string) {
    if (hits.length >= max) return;
    const items = await fs.readdir(p, { withFileTypes: true });
    for (const it of items) {
      if (hits.length >= max) return;
      if (it.name === ".git" || it.name === "node_modules") continue;
      const abs = path.join(p, it.name);
      if (it.isDirectory()) {
        await walk(abs);
      } else if (
        it.isFile() &&
        /\.(md|tex|bib|txt|markdown)$/i.test(it.name)
      ) {
        try {
          const content = await fs.readFile(abs, "utf8");
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              hits.push({
                file: path.relative(root, abs).replace(/\\/g, "/"),
                line: i + 1,
                preview: lines[i].slice(0, 240),
              });
              if (hits.length >= max) return;
            }
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  await walk(root);
  return hits;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
