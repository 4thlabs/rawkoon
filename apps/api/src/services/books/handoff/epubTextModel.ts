import { posix } from "node:path";

import {
  listZipEntries,
  readZipEntry,
  type ZipEntry,
} from "@rawkoon/api/utils/books/zipReader";
import { parseOpfMetadata } from "@rawkoon/api/utils/books/ebookMetadata";

/** One spine document: display text for snippets plus a normalized twin for matching. */
export interface EpubSpineDoc {
  /** OPF-relative href, exactly as the reader reports it. */
  href: string;
  /** Tag-stripped text with whitespace collapsed to single spaces. */
  text: string;
  /** Lowercase, accent-free, alphanumerics separated by single spaces. */
  norm: string;
  /** norm index -> text index, one entry per norm char. */
  normToText: Int32Array;
  /** Offset of this doc's first norm char in the whole-book normalized text. */
  normStart: number;
}

export interface EpubTextModel {
  docs: EpubSpineDoc[];
  /** Whole-book normalized text: doc norms joined by one space. */
  norm: string;
  /** Two-letter dc:language, when the OPF declares one. */
  language: string | null;
  /** Lazily built word-trigram index over `norm`, owned by fuzzyLocate. */
  trigramIndex?: Map<string, number[]>;
}

const SPECIAL_LETTERS: Record<string, string> = {
  œ: "oe",
  æ: "ae",
  ß: "ss",
  ø: "o",
  đ: "d",
  ł: "l",
};

const COMBINING_MARKS = /\p{M}/u;
const ALNUM = /[\p{L}\p{N}]/u;

/** Maps one display char to its normalized letters, or "" when it is a separator. */
function normalizeChar(ch: string): string {
  const lower = ch.toLowerCase();
  const special = SPECIAL_LETTERS[lower];
  if (special) return special;
  let out = "";
  for (const part of lower.normalize("NFKD")) {
    if (COMBINING_MARKS.test(part)) continue;
    if (ALNUM.test(part)) out += part;
  }
  return out;
}

export interface NormalizedText {
  norm: string;
  /** norm index -> index into the source string. */
  map: Int32Array;
}

/**
 * Whisper and the epub disagree on case, accents and punctuation, so both sides
 * are reduced to the same alphabet; the map lets a norm offset find its way back.
 */
export function normalizeText(source: string): NormalizedText {
  const chars: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;
  let i = 0;
  for (const ch of source) {
    const piece = normalizeChar(ch);
    if (piece === "") {
      pendingSpace = chars.length > 0;
    } else {
      if (pendingSpace) {
        chars.push(" ");
        map.push(i);
        pendingSpace = false;
      }
      for (const c of piece) {
        chars.push(c);
        map.push(i);
      }
    }
    i += ch.length;
  }
  return { norm: chars.join(""), map: Int32Array.from(map) };
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ocirc: "ô",
  ucirc: "û",
  icirc: "î",
  euml: "ë",
  iuml: "ï",
  ugrave: "ù",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  aacute: "á",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  oelig: "œ",
  aelig: "æ",
  szlig: "ß",
  shy: "",
  thinsp: " ",
  ensp: " ",
  emsp: " ",
  bull: "•",
  middot: "·",
};

export function decodeEntities(input: string): string {
  return input.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (match, dec?: string, hex?: string, name?: string) => {
      if (dec || hex) {
        const code = dec ? Number(dec) : Number.parseInt(hex ?? "", 16);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }
      const key = name ?? "";
      const decoded = NAMED_ENTITIES[key.toLowerCase()];
      if (decoded === undefined) return match;
      // `&Eacute;` is the capital of `&eacute;`; the table holds lowercase only.
      return /^[A-Z][a-z]/.test(key) ? decoded.toUpperCase() : decoded;
    },
  );
}

/** Markup to display text; block boundaries become spaces so words never fuse. */
export function htmlToText(html: string): string {
  const body = html
    .replace(/<head\b[\s\S]*?<\/head\s*>/gi, " ")
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const stripped = body
    .replace(
      /<\/?(?:p|div|br|h[1-6]|li|ul|ol|tr|td|th|dt|dd|blockquote|section|article|aside|header|footer|figcaption)\b[^>]*>/gi,
      " ",
    )
    .replace(/<[^>]+>/g, "");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim();
}

const attr = (tag: string, name: string): string | null => {
  const m = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(
    tag,
  );
  return m ? decodeEntities(m[1] ?? m[2] ?? "") : null;
};

/** Spine hrefs in reading order, OPF-relative, from the manifest + spine. */
export function parseSpineHrefs(opfXml: string): string[] {
  const manifest = new Map<string, string>();
  for (const tag of opfXml.match(/<item\b[^>]*>/gi) ?? []) {
    const id = attr(tag, "id");
    const href = attr(tag, "href");
    if (id && href) manifest.set(id, href);
  }
  const hrefs: string[] = [];
  for (const tag of opfXml.match(/<itemref\b[^>]*>/gi) ?? []) {
    const href = manifest.get(attr(tag, "idref") ?? "");
    if (href) hrefs.push(href);
  }
  return hrefs;
}

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const stripFragment = (href: string): string => href.split("#")[0] ?? href;

/** Compares hrefs the way readers differ on them: percent-encoding and fragments ignored. */
export const sameHref = (a: string, b: string): boolean =>
  safeDecode(stripFragment(a)) === safeDecode(stripFragment(b));

/** Assembles the model from already-extracted text, so tests need no zip. */
export function buildEpubTextModel(
  docs: { href: string; text: string }[],
  language: string | null,
): EpubTextModel {
  const built: EpubSpineDoc[] = [];
  let cursor = 0;
  for (const doc of docs) {
    const { norm, map } = normalizeText(doc.text);
    built.push({
      href: doc.href,
      text: doc.text,
      norm,
      normToText: map,
      normStart: cursor,
    });
    cursor += norm.length + 1;
  }
  return {
    docs: built,
    norm: built.map((d) => d.norm).join(" "),
    language,
  };
}

async function readEntryText(
  path: string,
  entries: Map<string, ZipEntry>,
  name: string,
): Promise<string | null> {
  const entry = entries.get(name);
  if (!entry) return null;
  const bytes = await readZipEntry(path, entry);
  return bytes ? bytes.toString("utf8") : null;
}

/** Null when the file is not an epub with a readable package document. */
export async function parseEpubTextModel(
  path: string,
): Promise<EpubTextModel | null> {
  const entries = new Map((await listZipEntries(path)).map((e) => [e.name, e]));

  const container = await readEntryText(
    path,
    entries,
    "META-INF/container.xml",
  );
  const rootTag = container?.match(/<rootfile\b[^>]*>/i)?.[0];
  const opfPath = rootTag ? attr(rootTag, "full-path") : null;
  if (!opfPath) return null;
  const opf = await readEntryText(path, entries, opfPath);
  if (!opf) return null;

  const base = posix.dirname(opfPath);
  const docs: { href: string; text: string }[] = [];
  for (const href of parseSpineHrefs(opf)) {
    const entryName = posix.normalize(
      base === "."
        ? safeDecode(stripFragment(href))
        : posix.join(base, safeDecode(stripFragment(href))),
    );
    const html = await readEntryText(path, entries, entryName);
    docs.push({ href, text: html ? htmlToText(html) : "" });
  }
  if (docs.length === 0) return null;
  return buildEpubTextModel(docs, parseOpfMetadata(opf).language);
}

const MODEL_CACHE_SIZE = 4;
const modelCache = new Map<string, EpubTextModel>();

/** Parsed per (path, size, mtime) so repeated handoffs on one book skip the unzip. */
export async function loadEpubTextModel(
  path: string,
): Promise<EpubTextModel | null> {
  const file = Bun.file(path);
  const key = `${path}|${file.size}|${file.lastModified}`;
  const hit = modelCache.get(key);
  if (hit) {
    // Re-insert to mark most recently used.
    modelCache.delete(key);
    modelCache.set(key, hit);
    return hit;
  }
  const model = await parseEpubTextModel(path);
  if (!model) return null;
  modelCache.set(key, model);
  while (modelCache.size > MODEL_CACHE_SIZE) {
    const oldest = modelCache.keys().next().value;
    if (oldest === undefined) break;
    modelCache.delete(oldest);
  }
  return model;
}

export const totalNormChars = (model: EpubTextModel): number =>
  model.norm.length;

export interface BookPosition {
  spineIndex: number;
  href: string;
  /** 0..1 within the doc. */
  progression: number;
  /** 0..1 across the book. */
  totalProgression: number;
}

/** Whole-book norm offset to the spine doc it falls in. */
export function offsetToPosition(
  model: EpubTextModel,
  offset: number,
): BookPosition {
  const total = Math.max(1, totalNormChars(model));
  const clamped = Math.min(Math.max(offset, 0), total);
  let index = 0;
  for (let i = 0; i < model.docs.length; i++) {
    const doc = model.docs[i];
    if (doc && doc.normStart <= clamped) index = i;
    else break;
  }
  const doc = model.docs[index];
  if (!doc) {
    return { spineIndex: 0, href: "", progression: 0, totalProgression: 0 };
  }
  const local = Math.min(clamped - doc.normStart, doc.norm.length);
  return {
    spineIndex: index,
    href: doc.href,
    progression: doc.norm.length > 0 ? local / doc.norm.length : 0,
    totalProgression: clamped / total,
  };
}

/** Inverse of offsetToPosition; null when the href is not in the spine. */
/**
 * Exact href first; then a unique suffix match, since a Readium client may
 * prefix the OPF directory (`OEBPS/ch1.xhtml`) or drop it.
 */
function findSpineDoc(
  model: EpubTextModel,
  href: string,
): EpubSpineDoc | undefined {
  const exact = model.docs.find((d) => sameHref(d.href, href));
  if (exact) return exact;
  const wanted = safeDecode(stripFragment(href));
  const suffixed = model.docs.filter((d) => {
    const have = safeDecode(stripFragment(d.href));
    return wanted.endsWith(`/${have}`) || have.endsWith(`/${wanted}`);
  });
  return suffixed.length === 1 ? suffixed[0] : undefined;
}

export function positionToOffset(
  model: EpubTextModel,
  href: string,
  progression: number,
): number | null {
  const doc = findSpineDoc(model, href);
  if (!doc) return null;
  const p = Math.min(Math.max(progression, 0), 1);
  return doc.normStart + Math.round(p * doc.norm.length);
}

export interface DisplaySnippet {
  before: string;
  highlight: string;
  after: string;
}

const SNIPPET_HIGHLIGHT_CHARS = 80;
const SNIPPET_CONTEXT_CHARS = 40;

/** Display-text snippet at a whole-book norm offset, for Readium to anchor on. */
export function snippetAtOffset(
  model: EpubTextModel,
  offset: number,
): DisplaySnippet {
  const pos = offsetToPosition(model, offset);
  const doc = model.docs[pos.spineIndex];
  if (!doc || doc.norm.length === 0) {
    return { before: "", highlight: "", after: "" };
  }
  const local = Math.min(
    Math.max(offset - doc.normStart, 0),
    doc.norm.length - 1,
  );
  const startText = doc.normToText[local] ?? 0;
  const endLocal = Math.min(
    local + SNIPPET_HIGHLIGHT_CHARS,
    doc.norm.length - 1,
  );
  let endText = (doc.normToText[endLocal] ?? doc.text.length) + 1;
  // Extend to the end of the word so the highlight is never cut mid-word.
  while (endText < doc.text.length && doc.text[endText] !== " ") endText++;
  return {
    before: doc.text.slice(
      Math.max(0, startText - SNIPPET_CONTEXT_CHARS),
      startText,
    ),
    highlight: doc.text.slice(startText, endText),
    after: doc.text.slice(endText, endText + SNIPPET_CONTEXT_CHARS),
  };
}
