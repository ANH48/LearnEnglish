import { ArrowRight, BookOpen, FileText, GraduationCap, type LucideIcon, PenTool, UserCheck } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { loadDashboardCounts } from "@/features/admin-dashboard/admin-dashboard-queries";
import { requireStaff } from "@/lib/auth/current-staff";
import { hasPermission } from "@/lib/permissions/check-permission";

type Tile = { label: string; value: number; icon: LucideIcon; tone: string; href?: string; hint?: string };

/** Home of the admin area: counts for the actor's scope and what is waiting for them. */
export default async function AdminDashboardPage() {
  const staff = await requireStaff();
  const { courses, lessons, customers, pendingEnrollments, toGrade } = await loadDashboardCounts(staff);

  const waiting: Tile[] = [
    ...(pendingEnrollments === null
      ? []
      : [{ label: "Yêu cầu chờ duyệt", value: pendingEnrollments, icon: UserCheck, tone: "bg-amber-100 text-amber-700", href: "/admin/enrollments", hint: "Duyệt ngay" }]),
    ...(toGrade === null
      ? []
      : [{ label: "Bài chờ chấm", value: toGrade, icon: PenTool, tone: "bg-rose-100 text-rose-700", href: "/admin/grading", hint: "Mở hàng chờ" }]),
  ];
  const totals: Tile[] = [
    { label: "Khóa học bạn quản lý", value: courses, icon: BookOpen, tone: "bg-secondary text-primary", href: hasPermission(staff, "course.manage") ? "/admin/courses" : undefined },
    { label: "Bài học", value: lessons, icon: FileText, tone: "bg-sky-100 text-sky-700" },
    ...(customers === null ? [] : [{ label: "Học viên", value: customers, icon: GraduationCap, tone: "bg-violet-100 text-violet-700", href: "/admin/customers" }]),
  ];

  return (
    <>
      <PageHeader title={`Xin chào, ${staff.fullName}`} description="Đây là tình hình lớp học của bạn hôm nay." />
      <div className="grid gap-8">
        {waiting.length > 0 && (
          <section className="grid gap-3">
            <h2 className="font-heading text-lg font-bold">Việc cần làm</h2>
            <div className="grid gap-4 sm:grid-cols-2">{waiting.map((tile) => <StatTile key={tile.label} tile={tile} highlight />)}</div>
          </section>
        )}
        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-bold">Tổng quan</h2>
          <div className="grid gap-4 sm:grid-cols-3">{totals.map((tile) => <StatTile key={tile.label} tile={tile} />)}</div>
        </section>
      </div>
    </>
  );
}

function StatTile({ tile, highlight = false }: { tile: Tile; highlight?: boolean }) {
  const { icon: Icon } = tile;
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid size-11 place-items-center rounded-xl ${tile.tone}`}>
          <Icon className="size-5" />
        </span>
        {tile.href && <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />}
      </div>
      <p className={`font-heading font-extrabold tabular-nums ${highlight ? "text-4xl" : "text-3xl"}`}>{tile.value}</p>
      <p className="text-sm text-muted-foreground">
        {tile.label}
        {tile.hint && tile.value > 0 && <span className="font-semibold text-primary"> · {tile.hint}</span>}
      </p>
    </>
  );
  const box = "group grid gap-2 rounded-2xl border bg-card p-5 shadow-sm";
  return tile.href ? (
    <Link href={tile.href} className={`${box} transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
