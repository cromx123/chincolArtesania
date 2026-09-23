import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "../icons";

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: string; back?: string; actions?: ReactNode }) {
  return (
    <header className="a-pagehead">
      {back && (
        <Link href={back} className="a-icon-btn a-pagehead__back" aria-label="Volver">
          <ArrowLeftIcon />
        </Link>
      )}
      <div className="a-pagehead__text">
        <h1>{title}</h1>
        {subtitle && <p className="a-muted">{subtitle}</p>}
      </div>
      {actions && <div className="a-pagehead__actions">{actions}</div>}
    </header>
  );
}
