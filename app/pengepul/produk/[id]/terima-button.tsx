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
  actorName?: string;
}

export default function TerimaButton({ productId, productName, productType, productSize, actorName }: Props) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
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
            actorName={actorName}
            productLabel={`${productName} · ${productType} · ${productSize}`}
            lockedProductName={`${productName} · ${productType} · ${productSize}`}
            onSaved={(_, warning) => {
              setNotice(warning || "Penerimaan tersimpan.");
              setOpen(false);
              router.refresh();
            }}
          />
        </Modal>
      ) : null}
      {notice ? <p className="hint" role="status">{notice}</p> : null}
    </>
  );
}
