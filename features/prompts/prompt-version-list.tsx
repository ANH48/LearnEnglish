import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { JsonView } from "@/components/admin/json-view";
import { Badge } from "@/components/ui/badge";
import { formatVietnamDateTime } from "@/lib/datetime/vietnam-time";
import { type PromptVersion, promptContentToEditableJson } from "@/lib/prompt-store/prompt-schemas";
import { applyPromptVersionAction } from "./prompt-actions";

/** Every version of a prompt, newest first, with its JSON and a button to apply it. */
export function PromptVersionList({ promptKey, versions, activeVersion }: { promptKey: string; versions: PromptVersion[]; activeVersion: string | null }) {
  if (versions.length === 0) return <p className="text-sm text-muted-foreground">Chưa có version nào.</p>;
  return (
    <ul className="grid gap-2">
      {versions.map((version) => (
        <li key={version.version} className="rounded-xl border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-semibold">{version.version}</span>
            {version.version === activeVersion && <Badge>Đang áp dụng</Badge>}
            <span className="text-xs text-muted-foreground">
              {formatVietnamDateTime(version.createdAt)} · {version.createdBy}
            </span>
            {version.version !== activeVersion && (
              <div className="ml-auto">
                <ConfirmActionButton
                  action={applyPromptVersionAction.bind(null, promptKey, version.version)}
                  label="Áp dụng"
                  confirmMessage={`Dùng version ${version.version} cho mọi lần gọi "${promptKey}" từ bây giờ?`}
                />
              </div>
            )}
          </div>
          {version.note && <p className="mt-1 text-sm">{version.note}</p>}
          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-muted-foreground">Xem prompt JSON</summary>
            <JsonView json={promptContentToEditableJson(version.content)} className="mt-2 max-h-[32rem]" />
          </details>
        </li>
      ))}
    </ul>
  );
}
