import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container empty empty--page">
      <h1>No encontramos esta página</h1>
      <p className="muted">Puede que el enlace esté mal escrito.</p>
      <Link href="/" className="btn btn--primary">
        Ir al inicio
      </Link>
    </div>
  );
}
