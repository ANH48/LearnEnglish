import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteGroupAction } from "@/features/groups/group-actions";
import { listGroupsWithCounts } from "@/features/groups/group-queries";
import { requireSuperadmin } from "@/lib/auth/current-staff";

export default async function GroupsPage() {
  await requireSuperadmin();
  const groups = await listGroupsWithCounts();

  return (
    <>
      <PageHeader
        title="Group quyền"
        description="Mỗi group là một tập quyền. Staff thuộc group nào thì có quyền của group đó."
        action={{ href: "/admin/groups/new", label: "Tạo group" }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Số quyền</TableHead>
            <TableHead>Số staff</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>
                <Link href={`/admin/groups/${group.id}`} className="font-medium hover:underline">
                  {group.name}
                </Link>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </TableCell>
              <TableCell className="tabular-nums">{group._count.permissions}</TableCell>
              <TableCell className="tabular-nums">{group._count.staff}</TableCell>
              <TableCell className="text-right">
                <ConfirmActionButton
                  action={deleteGroupAction.bind(null, group.id)}
                  label="Xóa"
                  variant="destructive"
                  confirmMessage={`Xóa group "${group.name}"? Staff trong group sẽ mất các quyền này.`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
