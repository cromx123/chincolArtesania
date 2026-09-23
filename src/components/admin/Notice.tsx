"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "../icons";

/** Aviso verde de "listo" que desaparece solo. */
export function Notice({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!visible || !message) return null;
  return (
    <div className="a-notice" role="status">
      <CheckIcon size={18} />
      {message}
    </div>
  );
}
