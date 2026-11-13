import { notFound } from "next/navigation";
import { ActionForm } from "@/components/admin/action-form";
import { PageHeader } from "@/components/admin/page-header";
import { AccountFormFields } from "@/features/accounts/account-form-fields";
import { saveCustomerAction } from "@/features/customers/customer-actions";
import { findCustomer } from "@/features/customers/customer-queries";
import { requirePermission } from "@/lib/auth/current-staff";
import { requireUuid } from "@/lib/forms/require-uuid";

/** `/admin/customers/new` creates a learner; any other id edits that learner. */
export default async function CustomerFormPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customer.manage");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew) requireUuid(id);
  const customer = isNew ? null : await findCustomer(id);
  if (!isNew && !customer) notFound();

  return (
    <>
      <PageHeader
        title={customer ? `Sửa học viên: ${customer.fullName}` : "Thêm học viên"}
        back={{ href: "/admin/customers", label: "Học viên" }}
      />
      <ActionForm action={saveCustomerAction.bind(null, customer?.id ?? null)}>
        <AccountFormFields account={customer ?? undefined} />
      </ActionForm>
    </>
  );
}
