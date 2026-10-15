import { describe, expect, test } from "bun:test";

import { buildEpubTextModel } from "@rawkoon/api/services/books/handoff/epubTextModel";
import { locateTranscript } from "@rawkoon/api/services/books/handoff/fuzzyLocate";
import { syntheticWords } from "@rawkoon/api/services/books/handoff/testSupport";

const target =
  "La rivière était glaciale ce matin-là, et personne au village ne croyait que l'enfant serait sauvé avant la tombée de la nuit.";

const model = buildEpubTextModel(
  [
    {
      href: "a.xhtml",
      text: `${syntheticWords(400, 1).join(" ")}. ${target} ${syntheticWords(400, 2).join(" ")}.`,
    },
    {
      href: "b.xhtml",
      text: "The lighthouse keeper counted the ships that passed in the fog, one after another, until the lamp finally burned out and the sea went quiet.",
    },
  ],
  "fr",
);

describe("locateTranscript", () => {
  test("finds an exact passage at the right offset", () => {
    const hit = locateTranscript(model, target);
    expect(hit?.score).toBeGreaterThan(0.95);
    expect(model.norm.slice(hit?.offset ?? 0)).toStartWith("la riviere etait");
  });

  test("tolerates Whisper-style substitutions and casing", () => {
    const heard =
      "la rivière était glacial ce matin-là et personne au village ne croyait que l'enfant serait sauvée avant la tombée de la nuit";
    const hit = locateTranscript(model, heard);
    expect(hit).not.toBeNull();
    expect(hit?.score).toBeGreaterThan(0.85);
    expect(model.norm.slice(hit?.offset ?? 0)).toStartWith("la riviere");
  });

  test("finds a passage in a later doc", () => {
    const hit = locateTranscript(
      model,
      "the lighthouse keeper counted the ship that passed in the fog one after another until the lamp finally burned out",
    );
    expect(hit).not.toBeNull();
    expect(hit?.offset).toBeGreaterThanOrEqual(model.docs[1]?.normStart ?? 0);
  });

  test("rejects unrelated text and clips too short to trust", () => {
    expect(
      locateTranscript(
        model,
        "completely different words about mountain climbing equipment and the weather forecast for next week",
      ),
    ).toBeNull();
    expect(locateTranscript(model, "Thanks for watching!")).toBeNull();
  });
});
