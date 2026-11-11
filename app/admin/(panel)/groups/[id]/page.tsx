import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { GroupForm } from "@/features/groups/group-form";
import { requireSuperadmin } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { requireUuid } from "@/lib/forms/require-uuid";

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperadmin();
  const { id } = await params;
  requireUuid(id);
  const group = await db.permissionGroup.findUnique({ where: { id }, include: { permissions: true } });
  if (!group) notFound();

  return (
    <>
      <PageHeader title={`Sửa group: ${group.name}`} back={{ href: "/admin/groups", label: "Group quyền" }} />
      <GroupForm
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          permissions: group.permissions.map((p) => p.permissionKey),
        }}
      />
    </>
  );
}
