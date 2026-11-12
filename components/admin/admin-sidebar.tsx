import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { logoutStaffAction } from "@/features/auth/logout-actions";
import type { CurrentStaff } from "@/lib/auth/current-staff";
import { hasPermission } from "@/lib/permissions/check-permission";
import { NAV_GROUPS } from "./admin-nav-items";
import { AdminNavLinks } from "./admin-nav-links";

/** Dark sidebar (top bar on phones). The menu only lists what the signed-in staff member may open. */
export function AdminSidebar({ staff }: { staff: CurrentStaff }) {
  const groups = NAV_GROUPS.map((group) => ({
    title: group.title,
    items: group.items
      .filter((item) => (item.superadminOnly ? staff.isSuperadmin : !item.permission || hasPermission(staff, item.permission)))
      .map(({ href, label }) => ({ href, label })),
  })).filter((group) => group.items.length > 0);
  const initial = staff.fullName.trim().split(/\s+/).at(-1)?.[0]?.toUpperCase() ?? "S";

  return (
    <aside className="relative isolate flex w-full shrink-0 flex-col gap-4 overflow-hidden bg-brand-ink p-3 text-white md:sticky md:top-0 md:h-screen md:w-64 md:gap-6 md:p-4">
      <div className="absolute -top-24 -left-24 -z-10 size-64 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="flex items-center justify-between gap-2 px-1">
        <BrandLogo tone="light" />
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-teal-300/15 px-2 py-0.5 text-[11px] font-semibold text-teal-200 ring-1 ring-teal-300/30">Admin</span>
          <form action={logoutStaffAction} className="md:hidden">
            <button type="submit" aria-label="Đăng xuất" className="grid size-10 cursor-pointer place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="min-h-0 flex-1 md:overflow-y-auto">
        <AdminNavLinks groups={groups} />
      </div>

      <div className="hidden grid-cols-1 gap-3 border-t border-white/10 pt-4 md:grid">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/60 transition-colors hover:text-white">
          <ExternalLink className="size-3.5" /> Xem trang học viên
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-white/6 p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-sun font-heading font-extrabold">{initial}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{staff.fullName}</p>
            <p className="truncate text-xs text-white/55">{staff.isSuperadmin ? "Superadmin" : staff.email}</p>
          </div>
          <form action={logoutStaffAction}>
            <button
              type="submit"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:outline-none"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
