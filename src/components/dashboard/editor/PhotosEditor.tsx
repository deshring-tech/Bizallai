"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Section } from "@/components/ui/Field";
import type { Photo } from "@/lib/domain/business";
import { ACCEPTED_IMAGE_TYPES, UploadError, deletePhoto, uploadPhoto } from "@/lib/storage";

type Props = {
  photos: Photo[];
  userId: string;
  businessId: string;
  onChange: (photos: Photo[]) => void;
};

const MAX_PHOTOS = 24;

export function PhotosEditor({ photos, userId, businessId, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).slice(0, MAX_PHOTOS - photos.length);
    setError(null);
    setUploading(files.length);

    // Uploaded in parallel, but committed to the profile in one update so a
    // partial failure cannot leave the list half written.
    const results = await Promise.allSettled(
      files.map((file) => uploadPhoto(file, { userId, businessId })),
    );

    const added: Photo[] = [];
    let failure: string | null = null;

    for (const result of results) {
      if (result.status === "fulfilled") {
        added.push({ url: result.value.url });
      } else if (!failure) {
        failure =
          result.reason instanceof UploadError
            ? result.reason.message
            : "Some images could not be uploaded.";
      }
    }

    if (added.length > 0) onChange([...photos, ...added]);
    setError(failure);
    setUploading(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number): void {
    const photo = photos[index];
    onChange(photos.filter((_, position) => position !== index));

    // Fire and forget: an orphaned object is cheaper than a blocked edit.
    if (photo) void deletePhoto(photo.url);
  }

  /** The first photo is the page's cover, so promoting one is just a reorder. */
  function makeCover(index: number): void {
    const photo = photos[index];
    if (!photo || index === 0) return;
    onChange([photo, ...photos.filter((_, position) => position !== index)]);
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <Section title="Photos" description="The first photo is the one customers see at the top.">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <li key={photo.url} className="group relative aspect-square overflow-hidden rounded-xl">
              <Image
                src={photo.url}
                alt={photo.alt ?? `Photo ${index + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 160px"
                className="object-cover"
              />

              {index === 0 ? (
                <span className="brand-bg absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium">
                  Cover
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(index)}
                  className="absolute top-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium"
                >
                  Make cover
                </button>
              )}

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[13px] font-medium"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading > 0 || atLimit}
        className="w-full rounded-xl border border-dashed border-[color:var(--color-hairline)] px-4 py-2.5 text-[14px] font-medium disabled:opacity-60"
      >
        {uploading > 0
          ? `Uploading ${uploading} image${uploading > 1 ? "s" : ""}…`
          : atLimit
            ? `Maximum ${MAX_PHOTOS} photos`
            : "Add photos"}
      </button>

      {error ? (
        <p role="alert" className="text-[13px] text-red-600">
          {error}
        </p>
      ) : null}
    </Section>
  );
}
