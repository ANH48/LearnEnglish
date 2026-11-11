import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader, statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteStaffAction } from "@/features/staff/staff-actions";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";

export default async function StaffListPage() {
  const actor = await requirePermission("staff.manage");
  const staffList = await db.staff.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { groups: { include: { group: true } } },
  });

  return (
    <>
      <PageHeader title="Staff" action={{ href: "/admin/staff/new", label: "Thêm staff" }} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffList.map((staff) => {
            const canTouch = actor.isSuperadmin || !staff.isSuperadmin;
            return (
              <TableRow key={staff.id}>
                <TableCell>
                  {canTouch ? (
                    <Link href={`/admin/staff/${staff.id}`} className="font-medium hover:underline">
                      {staff.fullName}
                    </Link>
                  ) : (
                    <span className="font-medium">{staff.fullName}</span>
                  )}
                  <p className="text-xs text-muted-foreground">{staff.email}</p>
                </TableCell>
                <TableCell>
                  {staff.isSuperadmin ? "Superadmin" : staff.groups.map((g) => g.group.name).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={staff.status === "active" ? "secondary" : "destructive"}>
                    {statusLabel(staff.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {canTouch && staff.id !== actor.id && (
                    <ConfirmActionButton
                      action={deleteStaffAction.bind(null, staff.id)}
                      label="Xóa"
                      variant="destructive"
                      confirmMessage={`Xóa tài khoản ${staff.fullName}?`}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
