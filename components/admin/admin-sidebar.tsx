import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutStaffAction } from "@/features/auth/logout-actions";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { hasPermission } from "@/lib/permissions/check-permission";
import type { PermissionKey } from "@/lib/permissions/permission-keys";

type NavItem = { href: string; label: string; permission?: PermissionKey; superadminOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/courses", label: "Khóa học", permission: "course.manage" },
  { href: "/admin/assessments", label: "Bài kiểm tra", permission: "assessment.manage" },
  { href: "/admin/enrollments", label: "Duyệt đăng ký", permission: "enrollment.review" },
  { href: "/admin/grading", label: "Chấm bài", permission: "grading.manual" },
  { href: "/admin/gradebook", label: "Bảng điểm", permission: "grading.manual" },
  { href: "/admin/categories", label: "Thể loại", permission: "category.manage" },
  { href: "/admin/customers", label: "Học viên", permission: "customer.manage" },
  { href: "/admin/staff", label: "Staff", permission: "staff.manage" },
  { href: "/admin/groups", label: "Group quyền", superadminOnly: true },
];

/** The menu only lists what the signed-in staff member is allowed to open. */
export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const items = NAV_ITEMS.filter((item) => {
    if (item.superadminOnly) return staff.isSuperadmin;
    return !item.permission || hasPermission(staff, item.permission);
  });

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-b p-4 md:w-56 md:border-r md:border-b-0">
      <div>
        <p className="font-semibold">LearnEnglish</p>
        <p className="text-xs text-muted-foreground">Quản trị</p>
      </div>
      <nav className="flex flex-wrap gap-1 md:flex-col">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto grid gap-2 text-sm">
        <div>
          <p className="font-medium">{staff.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {staff.isSuperadmin ? "Superadmin" : staff.email}
          </p>
        </div>
        <form action={logoutStaffAction}>
          <Button type="submit" variant="outline" size="sm">
            Đăng xuất
          </Button>
        </form>
      </div>
    </aside>
  );
}
