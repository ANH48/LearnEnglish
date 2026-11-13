/** Reading the OCR model's answer. Pure, so it is tested without calling the model. */

export const OCR_PROMPT_KEY = "ocr_image_to_text";
/** The longest text accepted back; a writing answer is capped at 10,000 characters too. */
export const MAX_OCR_TEXT = 10_000;

/**
 * With `json_object` the prompt asks for `{"text": "..."}`; with `text` the whole answer is the text.
 * Returns null when the answer is not in the agreed shape. Line breaks are kept; nothing is corrected.
 */
export function extractOcrText(raw: string, format: "text" | "json_object"): string | null {
  // A model in thinking mode may put its reasoning first; only the answer after it counts.
  const answer = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  let text: unknown = answer;
  if (format === "json_object") {
    try {
      text = (JSON.parse(answer) as { text?: unknown }).text;
    } catch {
      return null;
    }
  }
  if (typeof text !== "string") return null;
  const clean = text.replace(/\r\n?/g, "\n").trim();
  return clean.slice(0, MAX_OCR_TEXT);
}
