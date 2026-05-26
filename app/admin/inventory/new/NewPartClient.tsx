"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PartForm } from "@/components/inventory/PartForm";
import { createPart } from "../actions";

export function NewPartClient() {
  const router = useRouter();

  return (
    <PartForm
      action={createPart}
      submitLabel="Add part"
      onSuccess={() => {
        toast.success("Part added");
        router.push("/admin/inventory");
      }}
    />
  );
}
