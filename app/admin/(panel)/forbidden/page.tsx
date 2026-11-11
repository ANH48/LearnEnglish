import { PageHeader } from "@/components/admin/page-header";

export default function AdminForbiddenPage() {
  return (
    <PageHeader
      title="Bạn không có quyền làm việc này"
      description="Tài khoản của bạn chưa được cấp quyền cần thiết. Hãy liên hệ superadmin nếu bạn cần quyền này."
      back={{ href: "/admin", label: "Về trang tổng quan" }}
    />
  );
}
