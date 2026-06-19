export const MAX_IMAGE_SIZE_MB = 10;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateImageFile(file: File | null): ImageValidationResult {
  if (!file) {
    return { ok: false, message: "Selecciona una imagen JPG o PNG." };
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return {
      ok: false,
      message: "Formato no válido. Usa un archivo JPG o PNG.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      ok: false,
      message: `El archivo supera ${MAX_IMAGE_SIZE_MB} MB. Usa una imagen más liviana.`,
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
