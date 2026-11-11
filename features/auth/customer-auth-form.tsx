import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { SiteHeader } from "@/components/site/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-hashing";
import { customerLoginAction, registerCustomerAction } from "./customer-auth-actions";

/** The learner sign-in and sign-up pages share this layout; `mode` picks the fields. */
export function CustomerAuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const isRegister = mode === "register";
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>{isRegister ? "Tạo tài khoản học viên" : "Đăng nhập"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <ActionForm
              action={isRegister ? registerCustomerAction : customerLoginAction}
              submitLabel={isRegister ? "Tạo tài khoản" : "Đăng nhập"}
            >
              <input type="hidden" name="next" value={next ?? ""} />
              {isRegister && (
                <FormField label="Họ tên" htmlFor="fullName">
                  <Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} />
                </FormField>
              )}
              <FormField label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" autoComplete="username" required maxLength={200} />
              </FormField>
              <FormField label="Mật khẩu" htmlFor="password" hint={isRegister ? `Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.` : undefined}>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
                />
              </FormField>
            </ActionForm>
            <p className="text-sm text-muted-foreground">
              {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <Link href={`${isRegister ? "/login" : "/register"}${query}`} className="text-foreground underline">
                {isRegister ? "Đăng nhập" : "Đăng ký"}
              </Link>
            </p>
            {!isRegister && (
              <p className="text-xs text-muted-foreground">Quên mật khẩu? Hãy nhờ teacher đặt lại mật khẩu cho bạn.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
