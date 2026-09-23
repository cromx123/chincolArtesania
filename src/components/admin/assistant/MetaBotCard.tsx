import type { ChannelStatus } from "@/config/meta";
import { InstagramIcon, WhatsappIcon } from "../../icons";

const STATUS_TEXT: Record<ChannelStatus, { label: string; tone: string }> = {
  conectado: { label: "Conectado", tone: "a-pill--ok" },
  incompleto: { label: "Falta completar", tone: "a-pill--warn" },
  "sin-conectar": { label: "Sin conectar", tone: "" },
};

type Props = {
  status: { webhook: boolean; whatsapp: ChannelStatus; instagram: ChannelStatus };
  webhookUrl: string;
};

/** Bloque para conectar el bot de clientes con WhatsApp e Instagram (Meta). */
export function MetaBotCard({ status, webhookUrl }: Props) {
  const anyConnected = status.whatsapp === "conectado" || status.instagram === "conectado";

  return (
    <section className="a-card a-meta" aria-labelledby="meta-title">
      <div className="a-card__head">
        <h2 id="meta-title" className="a-card__title">
          Bot de Meta para tus clientes
        </h2>
        <span className="a-pill a-pill--info">Próximamente</span>
      </div>
      <p className="a-muted">
        Responderá solo los mensajes de WhatsApp e Instagram: stock, precios, plazos y pedidos a medida, con los mismos datos de tu tienda.
        {anyConnected ? " La conexión con Meta ya está configurada; las respuestas automáticas vienen en la próxima etapa." : " Todavía no está conectado."}
      </p>

      <ul className="a-meta__channels">
        <li>
          <span className="a-meta__icon">
            <WhatsappIcon size={22} />
          </span>
          <strong>WhatsApp Business</strong>
          <span className={`a-pill ${STATUS_TEXT[status.whatsapp].tone}`}>{STATUS_TEXT[status.whatsapp].label}</span>
        </li>
        <li>
          <span className="a-meta__icon">
            <InstagramIcon size={22} />
          </span>
          <strong>Instagram</strong>
          <span className={`a-pill ${STATUS_TEXT[status.instagram].tone}`}>{STATUS_TEXT[status.instagram].label}</span>
        </li>
      </ul>

      <details className="a-more">
        <summary>Cómo conectarlo (para quien instaló el sistema)</summary>
        <ol className="a-meta__steps">
          <li>
            En <span className="a-code">developers.facebook.com</span>, crea una app de tipo “Empresa” y agrega los productos WhatsApp e Instagram.
          </li>
          <li>
            Registra el webhook con esta URL (debe ser pública, con https):
            <span className="a-code a-code--block">{webhookUrl}</span>
          </li>
          <li>
            Inventa un token de verificación y úsalo igual en Meta y en <span className="a-code">META_VERIFY_TOKEN</span>.
          </li>
          <li>
            Completa en <span className="a-code">.env.local</span>: <span className="a-code">META_APP_SECRET</span>,{" "}
            <span className="a-code">META_ACCESS_TOKEN</span>, <span className="a-code">META_WHATSAPP_PHONE_NUMBER_ID</span> y{" "}
            <span className="a-code">META_INSTAGRAM_ACCOUNT_ID</span>. Reinicia el servidor.
          </li>
          <li>Suscribe el webhook a “messages”. El estado de arriba cambia a “Conectado”.</li>
        </ol>
        <p className="a-hint">
          Webhook: {status.webhook ? "verificación y firma configuradas." : "falta META_VERIFY_TOKEN y/o META_APP_SECRET."}
        </p>
      </details>
    </section>
  );
}
