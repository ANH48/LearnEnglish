"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requirePermission } from "@/lib/auth/current-staff";
import { type ActionState, validationFailed } from "@/lib/forms/action-state";
import { parsePromptContent, promptCategorySchema, promptKeySchema, promptVersionSchema } from "@/lib/prompt-store/prompt-schemas";
import { applyPromptVersion, createPromptVersion, getPromptCategory, savePromptCategory } from "@/lib/prompt-store/prompt-store";

const STORE_DOWN: ActionState = { error: "Không kết nối được MongoDB (prompt store). Kiểm tra MONGODB_URI rồi thử lại." };
const isDuplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Creates a category (`existingKey` null) or updates one; the key of an existing category never changes. */
export async function savePromptCategoryAction(existingKey: string | null, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("prompt.manage");
  const parsed = promptCategorySchema.safeParse({
    key: existingKey ?? formData.get("key"),
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    model: formData.get("model"),
  });
  if (!parsed.success) return validationFailed(parsed.error);
  try {
    if (existingKey === null && (await getPromptCategory(parsed.data.key))) return { error: "Đã có category dùng key này." };
    await savePromptCategory(parsed.data);
  } catch (error) {
    console.error(error);
    return STORE_DOWN;
  }
  await writeAuditLog(actor.id, existingKey ? "prompt_category.update" : "prompt_category.create", "prompt_category", parsed.data.key, {
    type: parsed.data.type,
    model: parsed.data.model,
  });
  revalidatePath("/admin/prompts");
  redirect(`/admin/prompts/${parsed.data.key}`);
}

/** Adds a version of a prompt. Versions are never edited: a change is always a new version. */
export async function createPromptVersionAction(key: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requirePermission("prompt.manage");
  if (!promptKeySchema.safeParse(key).success) return { error: "Key không hợp lệ." };
  const version = promptVersionSchema.safeParse(formData.get("version"));
  if (!version.success) return validationFailed(version.error);
  const content = parsePromptContent(String(formData.get("content") ?? ""));
  if (!content.ok) return { error: `Prompt JSON chưa đúng: ${content.error}` };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const apply = formData.get("apply") === "on";

  try {
    if (!(await getPromptCategory(key))) return { error: "Không tìm thấy category." };
    await createPromptVersion(key, version.data, content.content, note, `staff:${actor.id}`);
    if (apply) await applyPromptVersion(key, version.data);
  } catch (error) {
    if (isDuplicate(error)) return { error: `Version ${version.data} đã có. Hãy dùng số version mới.` };
    console.error(error);
    return STORE_DOWN;
  }
  await writeAuditLog(actor.id, "prompt_version.create", "prompt", key, { version: version.data, applied: apply });
  revalidatePath(`/admin/prompts/${key}`);
  redirect(`/admin/prompts/${key}`);
}

/** Makes one version the one every caller of this key uses from now on. */
export async function applyPromptVersionAction(key: string, version: string): Promise<void> {
  const actor = await requirePermission("prompt.manage");
  if (!promptKeySchema.safeParse(key).success || !promptVersionSchema.safeParse(version).success) return;
  if (!(await applyPromptVersion(key, version))) return;
  await writeAuditLog(actor.id, "prompt_version.apply", "prompt", key, { version });
  revalidatePath(`/admin/prompts/${key}`);
  revalidatePath("/admin/prompts");
}
