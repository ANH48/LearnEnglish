import { describe, expect, it } from "vitest";
import { MAX_OCR_TEXT, extractOcrText } from "./ocr-output";

describe("extractOcrText", () => {
  it("reads the text field of a JSON answer and keeps spelling mistakes and line breaks", () => {
    expect(extractOcrText('{"text": "I goed to scool.\\r\\nIt was fun "}', "json_object")).toBe("I goed to scool.\nIt was fun");
  });

  it("refuses an answer that is not the agreed JSON", () => {
    expect(extractOcrText("I goed to scool.", "json_object")).toBeNull();
    expect(extractOcrText('{"content": "x"}', "json_object")).toBeNull();
    expect(extractOcrText('{"text": 5}', "json_object")).toBeNull();
  });

  it("ignores the reasoning a thinking model writes before its answer", () => {
    expect(extractOcrText('<think>The page says...</think>\n{"text": "Me and him goes"}', "json_object")).toBe("Me and him goes");
  });

  it("takes a plain answer as it is", () => {
    expect(extractOcrText("  Hello  ", "text")).toBe("Hello");
  });

  it("caps very long answers", () => {
    expect(extractOcrText("a".repeat(MAX_OCR_TEXT + 50), "text")).toHaveLength(MAX_OCR_TEXT);
  });
});
