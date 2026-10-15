import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import {
  loadEpubTextModel,
  normalizeText,
  offsetToPosition,
  parseEpubTextModel,
  positionToOffset,
  snippetAtOffset,
} from "@rawkoon/api/services/books/handoff/epubTextModel";
import { writeFixtureEpub } from "@rawkoon/api/services/books/handoff/testSupport";

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

const fixture = async () => {
  const { dir, path } = await writeFixtureEpub([
    {
      href: "text/ch1.xhtml",
      body: "<h1>Premier</h1><p>La rivière était glacée, l&apos;hiver&nbsp;arrivait.</p>",
    },
    {
      href: "text/ch%202.xhtml",
      body: "<p>Elle a été sauvée. <em>Quelle</em> surprise&#8230;</p><p>Nous partons demain matin.</p>",
    },
    {
      href: "text/ch3.xhtml",
      body: "<p>The end of the road came quietly.</p>",
    },
  ]);
  dirs.push(dir);
  return path;
};

describe("normalizeText", () => {
  test("lowercases, strips accents and collapses punctuation to single spaces", () => {
    const { norm } = normalizeText("  L’Été — déjà « fini » !  Œuvre, ça.");
    expect(norm).toBe("l ete deja fini oeuvre ca");
  });

  test("maps each normalized char back to its display index", () => {
    const source = "Déjà vu";
    const { norm, map } = normalizeText(source);
    expect(norm).toBe("deja vu");
    expect(source[map[0] as number]).toBe("D");
    expect(source[map[norm.indexOf("vu")] as number]).toBe("v");
  });
});

describe("parseEpubTextModel", () => {
  test("reads spine hrefs OPF-relative, in order, with head and tags stripped", async () => {
    const model = await parseEpubTextModel(await fixture());
    expect(model?.docs.map((d) => d.href)).toEqual([
      "text/ch1.xhtml",
      "text/ch%202.xhtml",
      "text/ch3.xhtml",
    ]);
    expect(model?.language).toBe("fr");
    expect(model?.docs[0]?.text).toBe(
      "Premier La rivière était glacée, l'hiver arrivait.",
    );
    expect(model?.docs[0]?.norm).toBe(
      "premier la riviere etait glacee l hiver arrivait",
    );
    expect(model?.docs[1]?.norm).toContain("elle a ete sauvee quelle surprise");
    expect(model?.norm).not.toContain("ignored");
  });

  test("returns null for a file that is not an epub", async () => {
    const { dir, path } = await writeFixtureEpub([]);
    dirs.push(dir);
    expect(await parseEpubTextModel(path)).toBeNull();
  });

  test("serves a second load from the cache", async () => {
    const path = await fixture();
    const first = await loadEpubTextModel(path);
    expect(await loadEpubTextModel(path)).toBe(first);
  });
});

describe("offset and position mapping", () => {
  test("round-trips an offset through (href, progression)", async () => {
    const model = await parseEpubTextModel(await fixture());
    if (!model) throw new Error("fixture failed to parse");
    const second = model.docs[1];
    if (!second) throw new Error("missing doc");
    const offset = second.normStart + 10;

    const position = offsetToPosition(model, offset);
    expect(position.spineIndex).toBe(1);
    expect(position.href).toBe("text/ch%202.xhtml");
    expect(position.progression).toBeCloseTo(10 / second.norm.length, 6);
    expect(position.totalProgression).toBeCloseTo(
      offset / model.norm.length,
      6,
    );

    expect(positionToOffset(model, position.href, position.progression)).toBe(
      offset,
    );
  });

  test("matches a percent-decoded href and rejects an unknown one", async () => {
    const model = await parseEpubTextModel(await fixture());
    if (!model) throw new Error("fixture failed to parse");
    expect(positionToOffset(model, "text/ch 2.xhtml", 0)).toBe(
      model.docs[1]?.normStart ?? -1,
    );
    expect(positionToOffset(model, "nope.xhtml", 0.5)).toBeNull();
  });

  test("builds a display snippet around an offset", async () => {
    const model = await parseEpubTextModel(await fixture());
    if (!model) throw new Error("fixture failed to parse");
    const first = model.docs[0];
    if (!first) throw new Error("missing doc");
    const snippet = snippetAtOffset(
      model,
      first.normStart + first.norm.indexOf("glacee"),
    );
    expect(snippet.highlight.startsWith("glacée")).toBe(true);
    expect(snippet.before.endsWith("La rivière était ")).toBe(true);
  });
});
