import { redirect } from "next/navigation";
import { CustomerAuthForm } from "@/features/auth/customer-auth-form";
import { getCurrentCustomer } from "@/lib/auth/current-customer";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentCustomer()) redirect("/learn");
  const { next } = await searchParams;
  return <CustomerAuthForm mode="login" next={next} />;
}
