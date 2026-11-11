// The fixed permission list. Groups (stored in the database) are sets of these keys.
// Adding a permission means adding it here; superadmins cannot invent new keys in the UI.

export const PERMISSIONS = {
  "group.manage": "Tạo, sửa, xóa group quyền",
  "staff.assign_group": "Gán group cho tài khoản staff",
  "staff.manage": "Thêm, sửa, khóa tài khoản staff",
  "customer.manage": "Thêm, sửa, xóa học viên",
  "category.manage": "Thêm, sửa, xóa thể loại",
  "course.manage": "Thêm, sửa, xóa khóa học, bài học, bài tập",
  "assessment.manage": "Tạo bài test, bài thi, đặt lịch",
  "enrollment.review": "Duyệt hoặc từ chối học viên",
  "grading.manual": "Chấm bài viết, bài nói; xem điểm",
  "ai.use": "Dùng AI tách PDF và sinh giọng đọc",
  "prompt.manage": "Sửa prompt AI, tạo version, publish",
  "course.view_all": "Thấy tất cả khóa học thay vì chỉ khóa của mình",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Only a superadmin may hold these, whatever groups say. */
export const SUPERADMIN_ONLY: readonly PermissionKey[] = ["group.manage", "staff.assign_group"];

export function isPermissionKey(value: string): value is PermissionKey {
  // hasOwn, not `in`: inherited names such as "constructor" are not permissions.
  return Object.hasOwn(PERMISSIONS, value);
}

export const DEFAULT_GROUPS: { name: string; description: string; permissions: PermissionKey[] }[] = [
  {
    name: "Admin",
    description: "Quản lý toàn bộ nội dung và tài khoản",
    permissions: [
      "staff.manage",
      "customer.manage",
      "category.manage",
      "course.manage",
      "assessment.manage",
      "enrollment.review",
      "grading.manual",
      "ai.use",
      "course.view_all",
    ],
  },
  {
    name: "Teacher",
    description: "Quản lý các khóa học mình phụ trách",
    permissions: ["course.manage", "assessment.manage", "enrollment.review", "grading.manual", "ai.use"],
  },
];
