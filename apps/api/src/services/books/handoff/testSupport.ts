import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A stored (uncompressed) zip; zipReader never checks the CRC, so it stays 0. */
export function buildStoredZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralBytes.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, eocd]);
}

export interface FixtureDoc {
  href: string;
  /** Inner markup of <body>. */
  body: string;
}

/** Writes a minimal epub whose OPF sits in a subdirectory, as many real ones do. */
export async function writeFixtureEpub(
  docs: FixtureDoc[],
  language = "fr",
): Promise<{ dir: string; path: string }> {
  const manifest = docs
    .map(
      (d, i) =>
        `<item id="d${i}" href="${d.href}" media-type="application/xhtml+xml"/>`,
    )
    .join("");
  const spine = docs.map((_, i) => `<itemref idref="d${i}"/>`).join("");
  const files: Record<string, string> = {
    mimetype: "application/epub+zip",
    "META-INF/container.xml": `<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    "OEBPS/content.opf": `<?xml version="1.0"?><package><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Fixture</dc:title><dc:language>${language}</dc:language></metadata><manifest>${manifest}</manifest><spine>${spine}</spine></package>`,
  };
  for (const doc of docs) {
    files[`OEBPS/${decodeURIComponent(doc.href)}`] =
      `<html><head><title>ignored title</title><style>p{}</style></head><body>${doc.body}</body></html>`;
  }
  const dir = await mkdtemp(join(tmpdir(), "handoff-fixture-"));
  const path = join(dir, "book.epub");
  await writeFile(path, buildStoredZip(files));
  return { dir, path };
}

/** Deterministic made-up prose, so every trigram is effectively unique. */
export function syntheticWords(count: number, seed: number): string[] {
  const syllables = [
    "ba",
    "ro",
    "mi",
    "tel",
    "vu",
    "nor",
    "sa",
    "li",
    "dek",
    "po",
    "ful",
    "an",
  ];
  let state = seed;
  const next = (n: number) => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state % n;
  };
  const vocabulary = Array.from({ length: 400 }, () => {
    const parts = 1 + next(3);
    return Array.from(
      { length: parts + 1 },
      () => syllables[next(syllables.length)],
    ).join("");
  });
  return Array.from(
    { length: count },
    () => vocabulary[next(vocabulary.length)] as string,
  );
}
