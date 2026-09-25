import Link from "next/link";
import Image from "next/image";
import { instagramUrl, site, whatsappLink } from "@/config/site";
import { catalogService } from "@/server/container";
import { ProductGrid } from "@/components/ProductCard";
import { ArrowRightIcon, BirdsOrnament, ChincolBird, InstagramIcon, PencilIcon, ShieldIcon, StarIcon } from "@/components/icons";

const STEPS = [
  { n: "01", title: "Envías la idea", text: "Foto de referencia, medidas y uso." },
  { n: "02", title: "Cotizamos", text: "Precio y plazo según materiales." },
  { n: "03", title: "Lo hacemos", text: "Te enviamos avances del taller." },
];

export default async function HomePage() {
  const [featured, categories] = await Promise.all([catalogService.featured(4), catalogService.categoriesWithCount()]);
  const ig = instagramUrl();

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <ChincolBird size={300} strokeWidth={1.1} withLegs className="hero__watermark" />
          <span className="eyebrow eyebrow--accent">Taller de marroquinería</span>
          <h1>Cuero trabajado a mano, pieza por pieza.</h1>
          <p>Piezas del taller listas para enviar y encargos hechos a tu medida: elige el cuero, el hilo y el grabado.</p>
          <div className="hero__actions">
            <Link href="/catalogo" className="btn btn--primary">
              Ver catálogo
            </Link>
            <a href="#encargos" className="btn btn--outline">
              Pedir algo personalizado
            </a>
          </div>
          {ig && (
            <a href={ig} className="hero__social" target="_blank" rel="noopener noreferrer">
              <InstagramIcon />
              <span>
                También nos encuentras en Instagram como <strong>{site.instagram}</strong>
              </span>
            </a>
          )}
        </div>
        <div className="hero__media">
          <Image src="/images/main.jpg" alt="Bolso de cuero Chincol pintado a mano con una ballena" fill priority sizes="(max-width: 720px) 100vw, 52vw" className="hero__image" />
        </div>
      </section>

      <nav className="category-chips container" aria-label="Categorías">
        <Link href="/catalogo" className="chip chip--link chip--active">
          Todo
        </Link>
        {categories
          .filter((c) => c.count > 0)
          .map((c) => (
            <Link key={c.id} href={`/catalogo?categoria=${c.id}`} className="chip chip--link">
              {c.name}
            </Link>
          ))}
      </nav>

      <section className="section container">
        <div className="section__head">
          <div>
            <span className="eyebrow eyebrow--accent eyebrow--birds">
              Disponibles ahora <BirdsOrnament />
            </span>
            <h2 className="section__title">Piezas del taller</h2>
          </div>
          <Link href="/catalogo" className="link-arrow">
            Ver todo <span className="hide-mobile">el catálogo</span> <ArrowRightIcon size={17} />
          </Link>
        </div>
        <ProductGrid products={featured} variant="home" />
      </section>

      <section className="values">
        <div className="container values__inner">
          <div className="value">
            <StarIcon />
            <div>
              <strong>Cortado y cosido a mano</strong>
              <span>Cada pieza pasa por el taller</span>
            </div>
          </div>
          <div className="value">
            <ShieldIcon />
            <div>
              <strong>Cuero genuino seleccionado</strong>
              <span>Curtido vegetal y cuero graso</span>
            </div>
          </div>
          <div className="value">
            <PencilIcon />
            <div>
              <strong>Grabado de iniciales</strong>
              <span>En piezas seleccionadas</span>
            </div>
          </div>
        </div>
      </section>

      <section id="encargos" className="commission">
        <ChincolBird size={230} strokeWidth={1.2} withLegs className="commission__watermark" />
        <div className="container commission__inner">
          <div className="commission__copy">
            <span className="eyebrow commission__eyebrow">Por encargo</span>
            <h2>¿Buscas algo que no está en el catálogo?</h2>
            <p>Cuéntanos qué necesitas y lo cotizamos. Eliges cuero, color de hilo y grabado.</p>
            <a
              href={whatsappLink("Hola, quiero cotizar un pedido a medida.")}
              className="btn btn--light"
              target="_blank"
              rel="noopener noreferrer"
            >
              Solicitar cotización
            </a>
          </div>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n} className="step">
                <span className="step__n">{s.n}</span>
                <strong>{s.title}</strong>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="taller" className="section container workshop">
        <h2 className="section__title">El taller</h2>
        <p>
          {site.fullName} es un taller de marroquinería: cada pieza se corta, se cose y se termina a mano. Trabajamos piezas propias y
          encargos a medida.
        </p>
      </section>
    </>
  );
}
