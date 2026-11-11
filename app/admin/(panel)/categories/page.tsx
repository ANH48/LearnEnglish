import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCategoryAction } from "@/features/categories/category-actions";
import { CategoryForm } from "@/features/categories/category-form";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";

export default async function CategoriesPage() {
  await requirePermission("category.manage");
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: { where: { course: { deletedAt: null } } } } } },
  });

  return (
    <>
      <PageHeader title="Thể loại" description="Một khóa học có thể thuộc nhiều thể loại." />
      <div className="grid gap-8">
        <CategoryForm />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Đường dẫn</TableHead>
              <TableHead>Số khóa học</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Link href={`/admin/categories/${category.id}`} className="font-medium hover:underline">
                    {category.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{category.slug}</TableCell>
                <TableCell className="tabular-nums">{category._count.courses}</TableCell>
                <TableCell className="text-right">
                  <ConfirmActionButton
                    action={deleteCategoryAction.bind(null, category.id)}
                    label="Xóa"
                    variant="destructive"
                    confirmMessage={`Xóa thể loại "${category.name}"? Các khóa học vẫn còn, chỉ bỏ gắn thể loại này.`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
