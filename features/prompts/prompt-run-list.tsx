import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatVietnamDateTime } from "@/lib/datetime/vietnam-time";
import type { PromptRun } from "@/lib/prompt-store/prompt-schemas";

const STATUS: Record<PromptRun["status"], { label: string; variant: "default" | "destructive" | "outline" }> = {
  ok: { label: "OK", variant: "default" },
  error: { label: "Lỗi", variant: "destructive" },
  timeout: { label: "Quá giờ", variant: "outline" },
};

/** The latest calls of a prompt: which version and model ran, how long it took, and the error if any. */
export function PromptRunList({ runs }: { runs: PromptRun[] }) {
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">Chưa có lần gọi nào.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lúc</TableHead>
          <TableHead>Kết quả</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Thời gian</TableHead>
          <TableHead>Chi tiết</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, index) => (
          <TableRow key={index}>
            <TableCell className="text-xs whitespace-nowrap">{formatVietnamDateTime(run.createdAt)}</TableCell>
            <TableCell>
              <Badge variant={STATUS[run.status].variant}>{STATUS[run.status].label}</Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">{run.version}</TableCell>
            <TableCell className="font-mono text-xs">{run.model}</TableCell>
            <TableCell className="text-xs tabular-nums">{(run.latencyMs / 1000).toFixed(1)}s</TableCell>
            <TableCell className="max-w-md text-xs break-words">
              {run.error ?? Object.entries(run.subject).map(([name, value]) => `${name}: ${value ?? "-"}`).join(" · ")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
