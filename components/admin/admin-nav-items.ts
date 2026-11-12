import type { PermissionKey } from "@/lib/permissions/permission-keys";

/** Admin menu, grouped. Plain data so the server can filter it by permission before it reaches the browser. */
export type NavItem = { href: string; label: string; permission?: PermissionKey; superadminOnly?: boolean };

export const NAV_GROUPS: { title: string | null; items: NavItem[] }[] = [
  { title: null, items: [{ href: "/admin", label: "Tổng quan" }] },
  {
    title: "Nội dung",
    items: [
      { href: "/admin/courses", label: "Khóa học", permission: "course.manage" },
      { href: "/admin/lesson-audio", label: "Audio bài học", permission: "course.manage" },
      { href: "/admin/assessments", label: "Bài kiểm tra", permission: "assessment.manage" },
      { href: "/admin/categories", label: "Thể loại", permission: "category.manage" },
    ],
  },
  {
    title: "Lớp học",
    items: [
      { href: "/admin/enrollments", label: "Duyệt đăng ký", permission: "enrollment.review" },
      { href: "/admin/grading", label: "Chấm bài", permission: "grading.manual" },
      { href: "/admin/gradebook", label: "Bảng điểm", permission: "grading.manual" },
      { href: "/admin/customers", label: "Học viên", permission: "customer.manage" },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/staff", label: "Staff", permission: "staff.manage" },
      { href: "/admin/groups", label: "Group quyền", superadminOnly: true },
    ],
  },
];
