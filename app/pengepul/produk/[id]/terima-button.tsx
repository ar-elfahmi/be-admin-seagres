"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/app/components/pengepul-dashboard";
import AddFishermanForm from "@/app/components/forms/add-fisherman-form";

interface Props {
  productId: string;
  productName: string;
  productType: string;
  productSize: string;
}

export default function TerimaButton({ productId, productName, productType, productSize }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" className="primary-button" onClick={() => setOpen(true)}>
        <Plus /> Terima
      </button>
      {open ? (
        <Modal title={`Terima — ${productName}`} onClose={() => setOpen(false)}>
          <AddFishermanForm
            productId={productId}
            lockedProductName={`${productName} · ${productType} · ${productSize}`}
            onSaved={() => {
              setOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      ) : null}
    </>
  );
}
