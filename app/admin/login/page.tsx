import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { IconSlot, authInputClass } from "@/components/auth/auth-input-icon";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Input } from "@/components/ui/input";
import { staffLoginAction } from "@/features/auth/staff-login-action";
import { getCurrentStaff } from "@/lib/auth/current-staff";

export const metadata = { title: "Đăng nhập quản trị" };

export default async function AdminLoginPage() {
  if (await getCurrentStaff()) redirect("/admin");

  return (
    <AuthSplitLayout
      title="Khu quản trị"
      subtitle="Dành cho teacher và quản trị viên."
      footer={
        <p>
          Bạn là học viên?{" "}
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Đăng nhập tại đây
          </Link>
        </p>
      }
    >
      <ActionForm action={staffLoginAction} submitLabel="Đăng nhập" pendingLabel="Đang đăng nhập…" wideSubmit>
        <FormField label="Email" htmlFor="email">
          <IconSlot icon={<Mail />}>
            <Input id="email" name="email" type="email" autoComplete="username" required placeholder="ban@email.com" className={authInputClass} />
          </IconSlot>
        </FormField>
        <FormField label="Mật khẩu" htmlFor="password">
          <IconSlot icon={<Lock />}>
            <PasswordInput id="password" name="password" autoComplete="current-password" required placeholder="Nhập mật khẩu" className={authInputClass} />
          </IconSlot>
        </FormField>
      </ActionForm>
    </AuthSplitLayout>
  );
}
