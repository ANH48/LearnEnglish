import { FormField, nativeSelectClass } from "@/components/admin/form-field";
import { Input } from "@/components/ui/input";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-hashing";

type Props = {
  account?: { email: string; fullName: string; status: string };
};

/** Email, name, status and password inputs shared by the staff and learner forms. */
export function AccountFormFields({ account }: Props) {
  const isEdit = Boolean(account);
  return (
    <>
      <FormField label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={account?.email} required maxLength={200} />
      </FormField>
      <FormField label="Họ tên" htmlFor="fullName">
        <Input id="fullName" name="fullName" defaultValue={account?.fullName} required maxLength={120} />
      </FormField>
      <FormField label="Trạng thái" htmlFor="status">
        <select id="status" name="status" defaultValue={account?.status ?? "active"} className={nativeSelectClass}>
          <option value="active">Hoạt động</option>
          <option value="locked">Khóa</option>
        </select>
      </FormField>
      <FormField
        label={isEdit ? "Đặt lại mật khẩu" : "Mật khẩu"}
        htmlFor="password"
        hint={
          isEdit
            ? "Để trống nếu không đổi. Đổi mật khẩu sẽ đăng xuất tài khoản này ở mọi thiết bị."
            : `Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`
        }
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required={!isEdit}
          minLength={MIN_PASSWORD_LENGTH}
        />
      </FormField>
    </>
  );
}
