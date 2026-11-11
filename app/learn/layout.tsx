import type { ReactNode } from "react";
import { SiteHeader, SiteMain } from "@/components/site/site-header";
import { requireCustomer } from "@/lib/auth/current-customer";

export const metadata = { title: "Khóa của tôi" };

export default async function LearnLayout({ children }: { children: ReactNode }) {
  await requireCustomer();
  return (
    <>
      <SiteHeader />
      <SiteMain>{children}</SiteMain>
    </>
  );
}
