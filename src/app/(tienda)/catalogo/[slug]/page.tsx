import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { availabilityLabel, categoryName, getAvailability } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { catalogService } from "@/server/container";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductImage } from "@/components/ProductImage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await catalogService.getBySlug((await params).slug);
  return product ? { title: product.name, description: product.description } : {};
}

export default async function ProductPage({ params }: Props) {
  const product = await catalogService.getBySlug((await params).slug);
  if (!product) notFound();

  const related = await catalogService.related(product, 4);
  const availability = getAvailability(product);
  const details = product.details ?? {};

  return (
    <>
      <div className="container">
        <nav aria-label="Ruta" className="breadcrumb breadcrumb--product">
          <Link href="/">Inicio</Link>
          <span aria-hidden>/</span>
          <Link href="/catalogo">Catálogo</Link>
          <span aria-hidden>/</span>
          <Link href={`/catalogo?categoria=${product.category}`}>{categoryName(product.category)}</Link>
          <span aria-hidden>/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
      </div>

      <section className="container product">
        <ProductGallery product={product} />

        <div className="product__info">
          <div className="product__tags">
            <span className="eyebrow">{categoryName(product.category)}</span>
            <span className={`tag ${availability === "out_of_stock" ? "tag--muted" : availability === "made_to_order" ? "tag--warm" : "tag--ok"}`}>
              {availabilityLabel(product)}
            </span>
            {product.customizable && <span className="tag tag--warm">Personalizable</span>}
          </div>
          <h1 className="product__name">{product.name}</h1>
          <p className="product__desc">{product.description}</p>
          <div className="product__price">{formatPrice(product.price)}</div>
          <hr className="rule" />

          <ProductPurchase product={product} />

          <div className="accordion">
            <details>
              <summary>Medidas y materiales</summary>
              {details.measures && <p>{details.measures}</p>}
              {details.materials && <p>{details.materials}</p>}
              {!details.measures && !details.materials && <p>Escríbenos por WhatsApp y te contamos las medidas exactas.</p>}
            </details>
            <details>
              <summary>Cuidado del cuero</summary>
              <p>{details.care ?? "Limpia con un paño seco y aplica crema para cuero de vez en cuando. Evita dejarlo mojado o al sol directo por largo tiempo."}</p>
            </details>
            <details>
              <summary>Envíos y plazos</summary>
              <p>
                {availability === "made_to_order"
                  ? "Se fabrica al confirmar el pedido. Te informamos el plazo al cotizar."
                  : "Despacho o retiro en el taller, a coordinar al confirmar el pedido."}
              </p>
            </details>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related">
          <div className="container">
            <h2 className="section__title section__title--sm">También del taller</h2>
            <div className="related__list">
              {related.map((p) => (
                <Link key={p.id} href={`/catalogo/${p.slug}`} className="related-card">
                  <span className="related-card__media product-image">
                    <ProductImage product={p} sizes="80px" glyphSize={30} />
                  </span>
                  <span className="related-card__body">
                    <span className="product-card__name">{p.name}</span>
                    <span className="product-card__price">{formatPrice(p.price)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
