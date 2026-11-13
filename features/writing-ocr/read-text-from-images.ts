import "server-only";
import { type ChatPart, GroqError, groqChat } from "@/lib/ai/groq-chat";
import { fillPlaceholders, promptText } from "@/lib/prompt-store/prompt-schemas";
import { getActivePrompt, logPromptRun } from "@/lib/prompt-store/prompt-store";
import { OCR_PROMPT_KEY, extractOcrText } from "./ocr-output";

export type OcrResult = { ok: true; text: string } | { ok: false; reason: "unavailable" | "busy" | "timeout" | "failed" };

/** On a rate limit, wait and try once more only when Groq asks for a short wait. */
const MAX_RETRY_WAIT_SECONDS = 20;

const wait = (seconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, seconds * 1000);
    signal.addEventListener("abort", () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });

/**
 * Runs the applied version of the OCR prompt on up to 3 image URLs and traces the call in MongoDB
 * (key, version, model, outcome; never the learner's text or images).
 */
export async function readTextFromImages(input: {
  imageUrls: string[];
  actor: string;
  subject: Record<string, string | number | null>;
  signal: AbortSignal;
}): Promise<OcrResult> {
  let prompt;
  try {
    prompt = await getActivePrompt(OCR_PROMPT_KEY);
  } catch (error) {
    console.error("Prompt store unavailable", error);
    return { ok: false, reason: "unavailable" };
  }
  if (!prompt) {
    console.error(`No version of prompt "${OCR_PROMPT_KEY}" is applied.`);
    return { ok: false, reason: "unavailable" };
  }

  const started = Date.now();
  const trace = { key: prompt.key, version: prompt.version, model: prompt.model, actor: input.actor, subject: input.subject };
  const userText = fillPlaceholders(promptText(prompt.content.user), { imageCount: String(input.imageUrls.length) });
  const parts: ChatPart[] = [{ type: "text", text: userText }, ...input.imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url } }))];

  try {
    const call = () =>
      groqChat({
        model: prompt.model,
        messages: [
          { role: "system", content: promptText(prompt.content.system) },
          { role: "user", content: parts },
        ],
        content: prompt.content,
        signal: input.signal,
      });
    // The free Groq tier allows few tokens per minute (one image is about 2,000), so a short 429 wait is common.
    const answer = await call().catch(async (error: unknown) => {
      const retryAfter = error instanceof GroqError && error.status === 429 ? error.retryAfterSeconds : null;
      if (retryAfter === null || retryAfter > MAX_RETRY_WAIT_SECONDS) throw error;
      await wait(retryAfter, input.signal);
      return call();
    });
    const text = extractOcrText(answer.text, prompt.content.responseFormat);
    if (text === null) {
      await logPromptRun({ ...trace, status: "error", error: "Answer not in the agreed shape", latencyMs: Date.now() - started });
      return { ok: false, reason: "failed" };
    }
    await logPromptRun({
      ...trace,
      status: "ok",
      latencyMs: Date.now() - started,
      subject: { ...trace.subject, promptTokens: answer.usage.promptTokens, completionTokens: answer.usage.completionTokens },
    });
    return { ok: true, text };
  } catch (error) {
    const timedOut = input.signal.aborted;
    const message = error instanceof GroqError ? `${error.status ?? "-"}: ${error.message}` : String(error);
    await logPromptRun({ ...trace, status: timedOut ? "timeout" : "error", error: message.replace(/https?:\/\/\S+/g, "<url>").slice(0, 1000), latencyMs: Date.now() - started });
    const busy = error instanceof GroqError && error.status === 429;
    return { ok: false, reason: timedOut ? "timeout" : busy ? "busy" : "failed" };
  }
}
