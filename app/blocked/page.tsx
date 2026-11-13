import { SubmitButton } from "@/components/shared/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logoutCustomerAction, logoutStaffAction } from "@/features/auth/logout-actions";

export const metadata = { title: "Không vào được trang này" };

/** Shown when a learner session opens /admin, or a staff session opens the learner area. */
export default async function BlockedPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const isStaff = (await searchParams).as === "staff";

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Không vào được trang này</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <p>
            {isStaff
              ? "Bạn đang đăng nhập bằng tài khoản quản trị nên không vào được khu học viên."
              : "Bạn đang đăng nhập bằng tài khoản học viên nên không vào được trang quản trị."}{" "}
            Hãy đăng xuất trước nếu muốn dùng tài khoản khác.
          </p>
          <form action={isStaff ? logoutStaffAction : logoutCustomerAction}>
            <SubmitButton variant="outline">
              Đăng xuất
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
