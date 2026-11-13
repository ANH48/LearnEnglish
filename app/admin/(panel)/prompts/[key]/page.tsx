import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { PromptCategoryForm, PromptVersionForm } from "@/features/prompts/prompt-forms";
import { PromptRunList } from "@/features/prompts/prompt-run-list";
import { PromptVersionList } from "@/features/prompts/prompt-version-list";
import { requirePermission } from "@/lib/auth/current-staff";
import { nextPatchVersion, promptContentToEditableJson, promptKeySchema } from "@/lib/prompt-store/prompt-schemas";
import { getPromptCategory, listPromptRuns, listPromptVersions } from "@/lib/prompt-store/prompt-store";

const EMPTY_PROMPT = { system: [""], user: [""], responseFormat: "text", params: {} };

export default async function PromptCategoryPage({ params }: { params: Promise<{ key: string }> }) {
  await requirePermission("prompt.manage");
  const { key } = await params;
  if (!promptKeySchema.safeParse(key).success) notFound();

  const category = await getPromptCategory(key);
  if (!category) notFound();
  const [versions, runs] = await Promise.all([listPromptVersions(key), listPromptRuns(key, 50)]);
  const base = versions.find((v) => v.version === category.activeVersion) ?? versions[0];

  return (
    <>
      <PageHeader title={category.name} description={`${category.key} · type ${category.type} · model ${category.model}`} back={{ href: "/admin/prompts", label: "Prompt AI" }} />
      <div className="grid gap-10">
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Version</h2>
          <PromptVersionList promptKey={key} versions={versions} activeVersion={category.activeVersion} />
        </section>
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Tạo version mới</h2>
          <PromptVersionForm
            promptKey={key}
            nextVersion={nextPatchVersion(versions.map((v) => v.version))}
            initialJson={promptContentToEditableJson(base?.content ?? EMPTY_PROMPT)}
          />
        </section>
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">50 lần gọi gần nhất</h2>
          <PromptRunList runs={runs} />
        </section>
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Category</h2>
          <PromptCategoryForm category={category} />
        </section>
      </div>
    </>
  );
}
