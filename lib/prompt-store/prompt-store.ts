import "server-only";
import { mongo } from "./mongo-client";
import {
  type PromptCategory,
  type PromptCategoryInput,
  type PromptContent,
  type PromptRun,
  type PromptVersion,
  compareVersionsDesc,
  promptContentSchema,
} from "./prompt-schemas";

const categories = async () => (await mongo()).collection<PromptCategory>("prompt_categories");
const prompts = async () => (await mongo()).collection<PromptVersion>("prompts");
const runs = async () => (await mongo()).collection<PromptRun>("prompt_runs");
const noId = { projection: { _id: 0 } } as const;

export async function listPromptCategories(): Promise<PromptCategory[]> {
  return (await categories()).find({}, noId).sort({ type: 1, key: 1 }).toArray();
}

export async function getPromptCategory(key: string): Promise<PromptCategory | null> {
  return (await categories()).findOne({ key }, noId);
}

/** Creates the category or updates its name, type, description and model. The key never changes. */
export async function savePromptCategory(input: PromptCategoryInput): Promise<void> {
  const now = new Date();
  const { key, ...fields } = input;
  await (await categories()).updateOne(
    { key },
    { $set: { ...fields, updatedAt: now }, $setOnInsert: { key, activeVersion: null, createdAt: now } },
    { upsert: true },
  );
}

export async function listPromptVersions(key: string): Promise<PromptVersion[]> {
  const all = await (await prompts()).find({ key }, noId).toArray();
  return all.sort((a, b) => compareVersionsDesc(a.version, b.version));
}

export async function getPromptVersion(key: string, version: string): Promise<PromptVersion | null> {
  return (await prompts()).findOne({ key, version }, noId);
}

/** Versions are never edited, so every run can be traced to the exact text it used. Duplicates throw (code 11000). */
export async function createPromptVersion(key: string, version: string, content: PromptContent, note: string, createdBy: string): Promise<void> {
  await (await prompts()).insertOne({ key, version, content, note, createdBy, createdAt: new Date() });
}

/** Makes `version` the one callers use. Refuses a version that does not exist. */
export async function applyPromptVersion(key: string, version: string): Promise<boolean> {
  if (!(await getPromptVersion(key, version))) return false;
  const result = await (await categories()).updateOne({ key }, { $set: { activeVersion: version, updatedAt: new Date() } });
  return result.matchedCount === 1;
}

export type ActivePrompt = { key: string; version: string; model: string; content: PromptContent };

/** What a caller runs: the category's model and its applied version. Null when nothing is applied yet. */
export async function getActivePrompt(key: string): Promise<ActivePrompt | null> {
  const category = await getPromptCategory(key);
  if (!category?.activeVersion) return null;
  const prompt = await getPromptVersion(key, category.activeVersion);
  if (!prompt) return null;
  // Parsed again so a document edited by hand in MongoDB cannot reach the model in a broken shape.
  const content = promptContentSchema.safeParse(prompt.content);
  if (!content.success) throw new Error(`Prompt ${key} ${prompt.version} in MongoDB does not match the prompt schema.`);
  return { key, version: prompt.version, model: category.model, content: content.data };
}

/** Best effort: a trace that cannot be written must not fail the learner's request. */
export async function logPromptRun(run: Omit<PromptRun, "createdAt">): Promise<void> {
  try {
    await (await runs()).insertOne({ ...run, createdAt: new Date() });
  } catch (error) {
    console.error("Could not write prompt run trace", error);
  }
}

export async function listPromptRuns(key: string, limit = 50): Promise<PromptRun[]> {
  return (await runs()).find({ key }, noId).sort({ createdAt: -1 }).limit(limit).toArray();
}
