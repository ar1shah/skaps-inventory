"use client";

import { useRouter } from "next/navigation";
import { RepairItemForm } from "@/components/repair/RepairItemForm";
import { createRepairItem } from "@/app/admin/repair/actions";

export function NewRepairItemClient() {
  const router = useRouter();

  return (
    <RepairItemForm
      action={createRepairItem}
      submitLabel="Add part in repair"
      onSuccess={() => router.push("/admin/repair")}
    />
  );
}
