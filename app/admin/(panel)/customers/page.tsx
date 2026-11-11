import Link from "next/link";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PageHeader, statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteCustomerAction } from "@/features/customers/customer-actions";
import { requirePermission } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";

export default async function CustomersPage() {
  await requirePermission("customer.manage");
  const customers = await db.customer.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Học viên" action={{ href: "/admin/customers/new", label: "Thêm học viên" }} />
      {customers.length === 0 && <p className="text-sm text-muted-foreground">Chưa có học viên nào.</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Họ tên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày tạo</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:underline">
                  {customer.fullName}
                </Link>
                <p className="text-xs text-muted-foreground">{customer.email}</p>
              </TableCell>
              <TableCell>
                <Badge variant={customer.status === "active" ? "secondary" : "destructive"}>
                  {statusLabel(customer.status)}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">{customer.createdAt.toLocaleDateString("vi-VN")}</TableCell>
              <TableCell className="text-right">
                <ConfirmActionButton
                  action={deleteCustomerAction.bind(null, customer.id)}
                  label="Xóa"
                  variant="destructive"
                  confirmMessage={`Xóa học viên ${customer.fullName}? Điểm và bài làm cũ vẫn được giữ.`}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
