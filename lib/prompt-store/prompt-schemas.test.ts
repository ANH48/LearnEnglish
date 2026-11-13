import { describe, expect, it } from "vitest";
import { compareVersionsDesc, fillPlaceholders, nextPatchVersion, parsePromptContent, promptContentToEditableJson, promptText } from "./prompt-schemas";

describe("prompt schemas", () => {
  it("accepts a prompt JSON with defaults", () => {
    const parsed = parsePromptContent('{"system": "Copy the text.", "user": "Read {{imageCount}} images."}');
    expect(parsed).toEqual({ ok: true, content: { system: ["Copy the text."], user: ["Read {{imageCount}} images."], responseFormat: "text", params: {} } });
  });

  it("refuses broken JSON, missing fields and request options it does not know", () => {
    expect(parsePromptContent("{system:")).toEqual({ ok: false, error: "Not valid JSON." });
    expect(parsePromptContent('{"system": "x"}').ok).toBe(false);
    const sneaky = parsePromptContent('{"system": "x", "user": "y", "params": {"model": "other", "temperature": 0}}');
    expect(sneaky.ok).toBe(false);
  });

  it("keeps system and user as arrays of lines, the same shape in the editor and in storage", () => {
    const parsed = parsePromptContent('{"system": ["Rules:", "1. Copy \\"as is\\".", "", "2. No fixes."], "user": "Read it.\\nThen answer."}');
    expect(parsed.ok && parsed.content.system).toEqual(["Rules:", '1. Copy "as is".', "", "2. No fixes."]);
    expect(parsed.ok && parsed.content.user).toEqual(["Read it.", "Then answer."]);
    if (!parsed.ok) return;
    expect(parsePromptContent(promptContentToEditableJson(parsed.content))).toEqual(parsed);
    expect(promptText(parsed.content.system)).toBe('Rules:\n1. Copy "as is".\n\n2. No fixes.');
  });

  it("refuses an empty prompt text", () => {
    expect(parsePromptContent('{"system": ["", "  "], "user": ["x"]}').ok).toBe(false);
  });

  it("fills known placeholders and leaves unknown ones visible", () => {
    expect(fillPlaceholders("Read {{ imageCount }} images {{oops}}", { imageCount: "2" })).toBe("Read 2 images {{oops}}");
  });

  it("orders versions by number and proposes the next patch", () => {
    expect(["1.9.0", "1.10.0", "1.2.3"].sort(compareVersionsDesc)).toEqual(["1.10.0", "1.9.0", "1.2.3"]);
    expect(nextPatchVersion(["1.9.0", "1.10.0"])).toBe("1.10.1");
    expect(nextPatchVersion([])).toBe("1.0.0");
  });
});
