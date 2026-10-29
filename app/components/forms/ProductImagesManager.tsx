"use client";

// Reusable admin UI for managing a product's images.
//
// Two modes:
//   - "edit"   : the product already exists, so Add / Replace / Delete call the
//                backend immediately and the list reflects the server state.
//   - "create" : the product doesn't exist yet, so images are collected in
//                local "pending" state only (no API calls) and reported to the
//                parent via onPendingChange. The parent uploads them after the
//                product is created, and discards them if creation is cancelled.
//
// An image source is either a pasted URL or an uploaded File. The same control
// handles both.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductImage } from "@/lib/types";
import {
  addProductImages,
  replaceProductImage,
  deleteProductImage,
} from "@/lib/api";
import { notifySuccess, notifyFromError, notifyError } from "@/lib/toast";

/** Maximum allowed size per uploaded image file (5 MB). */
const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Keep only image files under the 5 MB limit. Any oversized files are dropped
 * and reported by name in an error toast, so they never enter state or an
 * upload request.
 */
function filterBySize(selected: File[]): File[] {
  const allowed: File[] = [];
  const rejected: string[] = [];
  for (const file of selected) {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      rejected.push(file.name);
    } else {
      allowed.push(file);
    }
  }
  if (rejected.length > 0) {
    notifyError(
      `${rejected.join(", ")} ${
        rejected.length === 1 ? "is" : "are"
      } larger than 5 MB and was not added.`
    );
  }
  return allowed;
}

/** A not-yet-uploaded image chosen during product creation. */
export type PendingImage =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File };

interface CommonProps {
  /** Heading/label styling helpers to stay consistent with the forms. */
  idPrefix: string;
}

interface EditModeProps extends CommonProps {
  mode: "edit";
  productId: number;
  images: ProductImage[];
  /** Called whenever the backend image list changes so the parent can sync. */
  onImagesChange: (images: ProductImage[]) => void;
}

interface CreateModeProps extends CommonProps {
  mode: "create";
  pending: PendingImage[];
  onPendingChange: (pending: PendingImage[]) => void;
}

type ProductImagesManagerProps = EditModeProps | CreateModeProps;

const labelClass = "mb-1 block text-sm font-medium text-slate-700";
const inputClass =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20";
const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-brand)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[var(--color-brand-hover)]";
const smallBtn =
  "rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[var(--color-canvas-alt)] disabled:cursor-not-allowed disabled:opacity-60";
const dangerBtn =
  "rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Thumbnail for a pending File: creates an object URL once and revokes it on
 * unmount so we don't leak blob URLs across re-renders.
 */
function PendingFileThumb({ file }: { file: File }) {
  // Derive the blob URL during render (no setState), and revoke it on unmount
  // or when the file changes so we don't leak object URLs.
  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);
  return <Thumb src={objectUrl} alt={file.name} />;
}

/** A simple image thumbnail with a graceful fallback for broken URLs. */
function Thumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas-alt)] text-[10px] text-slate-400">
        no preview
      </div>
    );
  }
  return (
    // Remote/blob image URLs aren't known at build time, so a plain <img> with
    // an onError fallback is the right tool (same rationale as ProductImage).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-16 w-16 shrink-0 rounded-lg border border-[var(--color-hairline)] object-cover"
    />
  );
}

export default function ProductImagesManager(props: ProductImagesManagerProps) {
  const { idPrefix } = props;

  // Shared "add" controls (URL text + file picker).
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-image replace: which image is being replaced, plus its chosen source.
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const clearAddInputs = () => {
    setUrl("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Add -----------------------------------------------------------------
  const handleAdd = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl && files.length === 0) {
      notifyFromError(null, "Enter an image URL or choose a file first.");
      return;
    }

    if (props.mode === "create") {
      // Collect locally; no API call until the product is created.
      const additions: PendingImage[] = [
        ...files.map((file) => ({ kind: "file" as const, file })),
        ...(trimmedUrl ? [{ kind: "url" as const, url: trimmedUrl }] : []),
      ];
      props.onPendingChange([...props.pending, ...additions]);
      clearAddInputs();
      return;
    }

    // Edit mode: upload immediately.
    setBusy(true);
    try {
      const added = await addProductImages(props.productId, {
        files: files.length > 0 ? files : undefined,
        urls: trimmedUrl ? [trimmedUrl] : undefined,
      });
      props.onImagesChange([...props.images, ...added]);
      notifySuccess(
        added.length > 1 ? `${added.length} images added.` : "Image added."
      );
      clearAddInputs();
    } catch (err) {
      notifyFromError(err, "Could not add the image.");
    } finally {
      setBusy(false);
    }
  };

  // --- Replace (edit mode only) --------------------------------------------
  const handleReplace = async (
    image: ProductImage,
    source: { file?: File; url?: string }
  ) => {
    if (props.mode !== "edit") return;
    setBusy(true);
    try {
      const updated = await replaceProductImage(
        props.productId,
        image.id,
        source
      );
      props.onImagesChange(
        props.images.map((img) => (img.id === image.id ? updated : img))
      );
      notifySuccess("Image replaced.");
      setReplacingId(null);
    } catch (err) {
      notifyFromError(err, "Could not replace the image.");
    } finally {
      setBusy(false);
    }
  };

  // --- Delete --------------------------------------------------------------
  const handleDeleteExisting = async (image: ProductImage) => {
    if (props.mode !== "edit") return;
    const confirmed = window.confirm("Delete this image? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(image.id);
    try {
      await deleteProductImage(props.productId, image.id);
      props.onImagesChange(props.images.filter((img) => img.id !== image.id));
      notifySuccess("Image deleted.");
    } catch (err) {
      notifyFromError(err, "Could not delete the image.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemovePending = (index: number) => {
    if (props.mode !== "create") return;
    props.onPendingChange(props.pending.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="grid gap-3 rounded-xl border border-[var(--color-hairline)] bg-white/60 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-700">
        Images
      </legend>

      {/* Existing / pending image list */}
      {props.mode === "edit" ? (
        props.images.length === 0 ? (
          <p className="text-xs text-slate-500">No images yet.</p>
        ) : (
          <ul className="grid gap-3">
            {props.images.map((image) => (
              <ImageRow
                key={image.id}
                idPrefix={idPrefix}
                src={image.url}
                alt={`Product image ${image.id}`}
                busy={busy}
                deleting={deletingId === image.id}
                replacing={replacingId === image.id}
                onStartReplace={() => setReplacingId(image.id)}
                onCancelReplace={() => setReplacingId(null)}
                onReplace={(source) => handleReplace(image, source)}
                onDelete={() => handleDeleteExisting(image)}
              />
            ))}
          </ul>
        )
      ) : props.pending.length === 0 ? (
        <p className="text-xs text-slate-500">
          No images added yet. They&apos;ll be uploaded when the product is
          created.
        </p>
      ) : (
        <ul className="grid gap-2">
          {props.pending.map((item, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-hairline)] bg-white p-2"
            >
              {item.kind === "url" ? (
                <Thumb src={item.url} alt={item.url} />
              ) : (
                <PendingFileThumb file={item.file} />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                {item.kind === "url" ? item.url : item.file.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePending(index)}
                className={dangerBtn}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add controls */}
      <div className="grid gap-2 border-t border-[var(--color-hairline)] pt-3">
        <div>
          <label htmlFor={`${idPrefix}-image-url`} className={labelClass}>
            Add by URL
          </label>
          <input
            id={`${idPrefix}-image-url`}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-image-file`} className={labelClass}>
            Or upload file(s)
          </label>
          <input
            ref={fileInputRef}
            id={`${idPrefix}-image-file`}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setFiles(filterBySize(Array.from(e.target.files ?? [])))
            }
            className={fileInputClass}
          />
        </div>
        <div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy}
            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Adding…" : props.mode === "create" ? "Add image" : "Upload image"}
          </button>
        </div>
      </div>
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// A single existing-image row with Replace / Delete controls.
// ---------------------------------------------------------------------------

interface ImageRowProps {
  idPrefix: string;
  src: string;
  alt: string;
  busy: boolean;
  deleting: boolean;
  replacing: boolean;
  onStartReplace: () => void;
  onCancelReplace: () => void;
  onReplace: (source: { file?: File; url?: string }) => void;
  onDelete: () => void;
}

function ImageRow({
  idPrefix,
  src,
  alt,
  busy,
  deleting,
  replacing,
  onStartReplace,
  onCancelReplace,
  onReplace,
  onDelete,
}: ImageRowProps) {
  const [replaceUrl, setReplaceUrl] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const submitReplace = () => {
    if (replaceFile) {
      onReplace({ file: replaceFile });
    } else if (replaceUrl.trim()) {
      onReplace({ url: replaceUrl.trim() });
    } else {
      notifyFromError(null, "Choose a replacement file or enter a URL.");
      return;
    }
    setReplaceUrl("");
    setReplaceFile(null);
    if (replaceFileRef.current) replaceFileRef.current.value = "";
  };

  return (
    <li className="grid gap-3 rounded-lg border border-[var(--color-hairline)] bg-white p-3">
      <div className="flex items-center gap-3">
        <Thumb src={src} alt={alt} />
        <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
          {src}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={replacing ? onCancelReplace : onStartReplace}
            disabled={busy}
            className={smallBtn}
          >
            {replacing ? "Cancel" : "Replace"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy || deleting}
            className={dangerBtn}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {replacing && (
        <div className="grid gap-2 border-t border-[var(--color-hairline)] pt-3">
          <div>
            <label
              htmlFor={`${idPrefix}-replace-url-${alt}`}
              className={labelClass}
            >
              Replace by URL
            </label>
            <input
              id={`${idPrefix}-replace-url-${alt}`}
              type="url"
              value={replaceUrl}
              onChange={(e) => setReplaceUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-replace-file-${alt}`}
              className={labelClass}
            >
              Or upload a file
            </label>
            <input
              ref={replaceFileRef}
              id={`${idPrefix}-replace-file-${alt}`}
              type="file"
              accept="image/*"
              onChange={(e) =>
                setReplaceFile(
                  filterBySize(Array.from(e.target.files ?? []))[0] ?? null
                )
              }
              className={fileInputClass}
            />
          </div>
          <div>
            <button
              type="button"
              onClick={submitReplace}
              disabled={busy}
              className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Replacing…" : "Confirm replace"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
