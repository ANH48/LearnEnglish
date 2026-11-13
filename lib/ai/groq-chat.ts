import "server-only";
import type { PromptContent } from "@/lib/prompt-store/prompt-schemas";

/**
 * Groq chat completions through plain fetch: the API is OpenAI-compatible, so no SDK is needed
 * (one endpoint, no extra dependency in the server bundle).
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type ChatPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ChatPart[] };

export class GroqError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** On 429: seconds Groq asks to wait before trying again. */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "GroqError";
  }
}

type GroqResponse = {
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
};

export async function groqChat(options: {
  model: string;
  messages: ChatMessage[];
  content: Pick<PromptContent, "responseFormat" | "params">;
  signal?: AbortSignal;
}): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number } }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqError("The AI service is not configured: set GROQ_API_KEY.", null);

  const body = {
    model: options.model,
    messages: options.messages,
    ...options.content.params,
    ...(options.content.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
  };
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options.signal,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as GroqResponse;
  if (!response.ok) {
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new GroqError(data.error?.message ?? `Groq answered ${response.status}`, response.status, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
  }

  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new GroqError("Groq returned no text.", response.status);
  return { text, usage: { promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 } };
}
