import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { logoutCustomerAction } from "@/features/auth/logout-actions";
import { getCurrentCustomer } from "@/lib/auth/current-customer";
import { readSession } from "@/lib/auth/session-cookies";

/** Top bar of the public site and the learner area. */
export async function SiteHeader() {
  const customer = await getCurrentCustomer();
  const staffSession = customer ? null : await readSession("staff");

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {customer ? (
            <>
              <Link href="/learn" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Khóa của tôi
              </Link>
              <span className="hidden text-muted-foreground sm:inline">{customer.fullName}</span>
              <form action={logoutCustomerAction}>
                <Button type="submit" variant="outline" size="sm">
                  Đăng xuất
                </Button>
              </form>
            </>
          ) : staffSession ? (
            <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Trang quản trị
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Đăng nhập
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteMain({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>;
}
