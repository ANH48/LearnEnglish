import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PromptCategoryForm } from "@/features/prompts/prompt-forms";
import { requirePermission } from "@/lib/auth/current-staff";
import type { PromptCategory } from "@/lib/prompt-store/prompt-schemas";
import { listPromptCategories } from "@/lib/prompt-store/prompt-store";

export default async function PromptsPage() {
  await requirePermission("prompt.manage");
  let categories: PromptCategory[] | null = null;
  try {
    categories = await listPromptCategories();
  } catch (error) {
    console.error(error);
  }

  return (
    <>
      <PageHeader title="Prompt AI" description="Mỗi category là một việc AI làm (đọc chữ từ ảnh, chấm bài…): chọn model và version prompt đang áp dụng. Lưu trên MongoDB." />
      {categories === null ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Không kết nối được MongoDB. Kiểm tra biến MONGODB_URI.
        </p>
      ) : (
        <div className="grid gap-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Version đang dùng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.key}>
                  <TableCell>
                    <Link href={`/admin/prompts/${category.key}`} className="font-mono text-sm font-medium hover:underline">
                      {category.key}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{category.type}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="font-mono text-xs">{category.model}</TableCell>
                  <TableCell>{category.activeVersion ? <Badge>{category.activeVersion}</Badge> : <Badge variant="outline">Chưa áp dụng</Badge>}</TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Chưa có category nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">Thêm category</h2>
            <PromptCategoryForm />
          </section>
        </div>
      )}
    </>
  );
}
