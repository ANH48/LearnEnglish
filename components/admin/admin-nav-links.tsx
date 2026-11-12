"use client";

import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  PenTool,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/courses": BookOpen,
  "/admin/assessments": ClipboardList,
  "/admin/categories": FolderTree,
  "/admin/enrollments": UserCheck,
  "/admin/grading": PenTool,
  "/admin/gradebook": ClipboardCheck,
  "/admin/customers": GraduationCap,
  "/admin/staff": UsersRound,
  "/admin/groups": ShieldCheck,
};

type Group = { title: string | null; items: { href: string; label: string }[] };

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar links with icons; the current section is highlighted. */
export function AdminNavLinks({ groups }: { groups: Group[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Quản trị" className="flex gap-1 overflow-x-auto md:grid md:gap-5 md:overflow-visible">
      {groups.map((group, i) => (
        <div key={group.title ?? i} className="flex gap-1 md:grid">
          {group.title && <p className="hidden px-3 pb-1 text-[11px] font-semibold tracking-wider text-white/40 uppercase md:block">{group.title}</p>}
          {group.items.map((item) => {
            const Icon = ICONS[item.href] ?? LayoutDashboard;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:outline-none",
                  active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
                )}
              >
                {active && <span className="absolute inset-y-2 left-0 hidden w-1 rounded-full bg-teal-300 md:block" />}
                <Icon className={cn("size-4.5 shrink-0", active ? "text-teal-300" : "")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
