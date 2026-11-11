import { redirect } from "next/navigation";
import { CustomerAuthForm } from "@/features/auth/customer-auth-form";
import { getCurrentCustomer } from "@/lib/auth/current-customer";

export const metadata = { title: "Đăng ký" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentCustomer()) redirect("/learn");
  const { next } = await searchParams;
  return <CustomerAuthForm mode="register" next={next} />;
}
