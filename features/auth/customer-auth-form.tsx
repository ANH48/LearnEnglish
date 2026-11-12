import { Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { FormField } from "@/components/admin/form-field";
import { IconSlot, authInputClass } from "@/components/auth/auth-input-icon";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-hashing";
import { customerLoginAction, registerCustomerAction } from "./customer-auth-actions";

/** The learner sign-in and sign-up pages share this layout; `mode` picks the fields. */
export function CustomerAuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const isRegister = mode === "register";
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <AuthSplitLayout
      title={isRegister ? "Bắt đầu học thôi!" : "Chào mừng trở lại"}
      subtitle={isRegister ? "Tạo tài khoản học viên miễn phí, chỉ mất một phút." : "Đăng nhập để học tiếp bài của bạn."}
      footer={
        <>
          <p>
            {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
            <Link href={`${isRegister ? "/login" : "/register"}${query}`} className="font-semibold text-primary underline-offset-4 hover:underline">
              {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
            </Link>
          </p>
          {!isRegister && <p className="text-xs">Quên mật khẩu? Hãy nhờ teacher đặt lại mật khẩu cho bạn.</p>}
        </>
      }
    >
      <ActionForm
        action={isRegister ? registerCustomerAction : customerLoginAction}
        submitLabel={isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        pendingLabel={isRegister ? "Đang tạo tài khoản…" : "Đang đăng nhập…"}
        wideSubmit
      >
        <input type="hidden" name="next" value={next ?? ""} />
        {isRegister && (
          <FormField label="Họ tên" htmlFor="fullName">
            <IconSlot icon={<User />}>
              <Input id="fullName" name="fullName" autoComplete="name" required maxLength={120} placeholder="Nguyễn Văn A" className={authInputClass} />
            </IconSlot>
          </FormField>
        )}
        <FormField label="Email" htmlFor="email">
          <IconSlot icon={<Mail />}>
            <Input id="email" name="email" type="email" autoComplete="username" required maxLength={200} placeholder="ban@email.com" className={authInputClass} />
          </IconSlot>
        </FormField>
        <FormField label="Mật khẩu" htmlFor="password" hint={isRegister ? `Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.` : undefined}>
          <IconSlot icon={<Lock />}>
            <PasswordInput
              id="password"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={isRegister ? MIN_PASSWORD_LENGTH : undefined}
              placeholder="Nhập mật khẩu"
              className={authInputClass}
            />
          </IconSlot>
        </FormField>
      </ActionForm>
    </AuthSplitLayout>
  );
}
