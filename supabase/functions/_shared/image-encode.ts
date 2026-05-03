export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ValidateImageSizeResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "too_large" };

export function validateImageSize(size: number, max: number = MAX_IMAGE_BYTES): ValidateImageSizeResult {
  if (size <= 0) return { ok: false, reason: "empty" };
  if (size > max) return { ok: false, reason: "too_large" };
  return { ok: true };
}

const CHUNK_SIZE = 0x8000;

export function bytesToBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}
