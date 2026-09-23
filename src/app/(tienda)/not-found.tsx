import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container empty empty--page">
      <h1>No encontramos esta página</h1>
      <p className="muted">Puede que la pieza ya no esté en el catálogo.</p>
      <Link href="/catalogo" className="btn btn--primary">
        Ir al catálogo
      </Link>
    </div>
  );
}
