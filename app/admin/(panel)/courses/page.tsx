import Link from "next/link";
import { PageHeader, statusLabel } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCoursesInScope } from "@/features/courses/course-queries";
import { requirePermission } from "@/lib/auth/current-staff";

export default async function CoursesPage() {
  const staff = await requirePermission("course.manage");
  const courses = await listCoursesInScope(staff);

  return (
    <>
      <PageHeader title="Khóa học" action={{ href: "/admin/courses/new", label: "Tạo khóa học" }} />
      {courses.length === 0 && <p className="text-sm text-muted-foreground">Chưa có khóa học nào.</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Khóa học</TableHead>
            <TableHead>Thể loại</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Bài học</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell>
                <Link href={`/admin/courses/${course.id}`} className="font-medium hover:underline">
                  {course.title}
                </Link>
              </TableCell>
              <TableCell>{course.categories.map((c) => c.category.name).join(", ") || "—"}</TableCell>
              <TableCell>{course.teachers.map((t) => t.staff.fullName).join(", ") || "—"}</TableCell>
              <TableCell className="tabular-nums">{course._count.lessons}</TableCell>
              <TableCell>
                <Badge variant={course.status === "published" ? "default" : "secondary"}>
                  {statusLabel(course.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
