"use client";

import { useRef, useState } from "react";
import { uploadPhotosAction } from "@/app/admin/_actions/products";
import { CameraIcon } from "../icons";

const MAX_PHOTOS = 8;

/** Fotos del producto. Se suben apenas se eligen; la primera es la principal. */
export function PhotoManager({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - images.length;
    const selected = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Puedes tener hasta ${MAX_PHOTOS} fotos por producto.`);

    let current = images;
    const rejected: string[] = [];
    // De a una: así funciona bien incluso con internet lento en el celular.
    for (const file of selected) {
      setUploading((n) => n + 1);
      const data = new FormData();
      data.append("fotos", file);
      try {
        const result = await uploadPhotosAction(data);
        current = [...current, ...result.urls];
        rejected.push(...result.rejected);
        onChange(current);
      } catch {
        rejected.push(file.name);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (rejected.length) setError(`No pudimos subir ${rejected.length === 1 ? "una foto" : `${rejected.length} fotos`}. Prueba con otra imagen (máx. 15 MB).`);
    if (input.current) input.current.value = "";
  }

  function makeMain(i: number) {
    onChange([images[i], ...images.filter((_, n) => n !== i)]);
  }

  function remove(i: number) {
    onChange(images.filter((_, n) => n !== i));
  }

  return (
    <div className="a-photos">
      <div className="a-photos__grid">
        {images.map((src, i) => (
          <figure key={src} className="a-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Foto ${i + 1}`} />
            {i === 0 && <span className="a-photo__main">Principal</span>}
            <figcaption className="a-photo__actions">
              {i > 0 && (
                <button type="button" onClick={() => makeMain(i)}>
                  Hacer principal
                </button>
              )}
              <button type="button" onClick={() => remove(i)}>
                Quitar
              </button>
            </figcaption>
          </figure>
        ))}
        {Array.from({ length: uploading }, (_, i) => (
          <div key={`up-${i}`} className="a-photo a-photo--loading" aria-live="polite">
            Subiendo…
          </div>
        ))}
        {images.length + uploading < MAX_PHOTOS && (
          <button type="button" className="a-photo a-photo--add" onClick={() => input.current?.click()}>
            <CameraIcon />
            {images.length ? "Agregar fotos" : "Subir fotos"}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="a-error">{error}</p>}
      <p className="a-hint">Puedes sacarlas directo con el celular. La primera es la que se ve en el catálogo.</p>
    </div>
  );
}
