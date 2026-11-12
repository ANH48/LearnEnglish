import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { requireStaff } from "@/lib/auth/current-staff";

export const metadata = { title: "Quản trị LearnEnglish" };

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col bg-muted/50 md:flex-row">
      <AdminSidebar staff={staff} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
