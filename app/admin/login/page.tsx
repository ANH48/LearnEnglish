import { redirect } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { staffLoginAction } from "@/features/auth/staff-login-action";
import { getCurrentStaff } from "@/lib/auth/current-staff";

export const metadata = { title: "Đăng nhập quản trị" };

export default async function AdminLoginPage() {
  if (await getCurrentStaff()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đăng nhập quản trị</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={staffLoginAction} submitLabel="Đăng nhập">
            <FormField label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </FormField>
            <FormField label="Mật khẩu" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </FormField>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
