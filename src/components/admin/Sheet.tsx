"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { CloseIcon } from "../icons";

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Ventana que sube desde abajo en el celular y aparece al centro en el computador. */
export function Sheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="a-sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      {open && (
        <div className="a-sheet__body">
          <div className="a-sheet__head">
            <h2>{title}</h2>
            <button type="button" className="a-icon-btn" aria-label="Cerrar" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
