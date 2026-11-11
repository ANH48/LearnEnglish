import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/current-staff";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/check-permission";
import { courseScopeWhere } from "@/lib/permissions/course-scope";

export default async function AdminDashboardPage() {
  const staff = await requireStaff();
  const scope = courseScopeWhere(staff);

  const [courses, lessons, customers] = await Promise.all([
    db.course.count({ where: scope }),
    db.lesson.count({ where: { deletedAt: null, course: scope } }),
    hasPermission(staff, "customer.manage") ? db.customer.count({ where: { deletedAt: null } }) : null,
  ]);

  const tiles = [
    { label: "Khóa học bạn quản lý", value: courses },
    { label: "Bài học", value: lessons },
    ...(customers === null ? [] : [{ label: "Học viên", value: customers }]),
  ];

  return (
    <>
      <PageHeader title={`Xin chào, ${staff.fullName}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold tabular-nums">{tile.value}</CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
