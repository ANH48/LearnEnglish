import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryForm } from "@/features/categories/category-form";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("category.manage");
  const { id } = await params;
  requireUuid(id);
  const category = await db.category.findFirst({ where: { id, deletedAt: null } });
  if (!category) notFound();

  return (
    <>
      <PageHeader title={`Sửa thể loại: ${category.name}`} back={{ href: "/admin/categories", label: "Thể loại" }} />
      <CategoryForm category={category} />
    </>
  );
}
