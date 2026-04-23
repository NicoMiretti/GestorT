export type BibEntry = {
  type: string;        // article, book, inproceedings...
  key: string;         // citation key
  fields: Record<string, string>;
  raw: string;
};

export function parseBibtex(src: string): BibEntry[] {
  const out: BibEntry[] = [];
  // Encuentra @type{key, ... }
  const re = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const [raw, type, key, body] = m;
    const fields: Record<string, string> = {};
    // field = {value} | "value" | digits
    const fre = /(\w+)\s*=\s*(\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))\s*,?/g;
    let fm: RegExpExecArray | null;
    while ((fm = fre.exec(body))) {
      const name = fm[1].toLowerCase();
      const value = fm[3] ?? fm[4] ?? fm[5] ?? "";
      fields[name] = value.trim();
    }
    out.push({ type: type.toLowerCase(), key, fields, raw });
  }
  return out;
}

export function serializeBibtex(entries: BibEntry[]): string {
  return entries
    .map((e) => {
      const fields = Object.entries(e.fields)
        .map(([k, v]) => `  ${k} = {${v}}`)
        .join(",\n");
      return `@${e.type}{${e.key},\n${fields}\n}`;
    })
    .join("\n\n") + "\n";
}
