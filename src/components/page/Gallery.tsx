import Image from "next/image";
import type { Photo } from "@/lib/domain/business";

/** The first photo is the hero, so the gallery shows everything after it. */
export function Gallery({ photos, businessName }: { photos: readonly Photo[]; businessName: string }) {
  const rest = photos.slice(1);
  if (rest.length === 0) return null;

  return (
    <section className="px-5 pt-8">
      <h2 className="text-lg font-semibold">Photos</h2>

      <ul className="mt-3 grid grid-cols-3 gap-2">
        {rest.map((photo, index) => (
          <li key={photo.url} className="relative aspect-square overflow-hidden rounded-xl">
            <Image
              src={photo.url}
              alt={photo.alt ?? `${businessName} photo ${index + 2}`}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
