"use client";

import { deleteCustomerAction } from "@/app/admin/_actions/customers";
import { ConfirmButton } from "./ConfirmButton";

export function CustomerDelete({ id }: { id: string }) {
  return (
    <ConfirmButton
      label="Borrar sus datos"
      confirmLabel="Sí, borrar"
      warning="Se borran su nombre, teléfono y correo (por ejemplo, si te lo pide). Sus ventas quedan registradas, pero sin la clienta asociada."
      onConfirm={() => deleteCustomerAction(id)}
    />
  );
}
