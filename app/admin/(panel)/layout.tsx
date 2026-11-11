import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireStaff } from "@/lib/auth/current-staff";

export const metadata = { title: "Quản trị LearnEnglish" };

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar staff={staff} />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
