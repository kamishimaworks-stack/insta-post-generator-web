export type ParseImagePathResult =
  | { ok: true; bucket: "post-images"; filePath: string }
  | { ok: false; reason:
      | "empty"
      | "invalid_type"
      | "invalid_bucket"
      | "user_mismatch"
      | "no_filename"
      | "path_traversal"
      | "invalid_user_id" };

const ALLOWED_BUCKET = "post-images";
const FORBIDDEN_SEGMENTS = new Set(["", ".", ".."]);

export function parseImagePath(image_path: unknown, userId: unknown): ParseImagePathResult {
  if (typeof image_path !== "string") return { ok: false, reason: "invalid_type" };
  if (image_path.length === 0) return { ok: false, reason: "empty" };

  if (typeof userId !== "string" || userId.trim().length === 0) {
    return { ok: false, reason: "invalid_user_id" };
  }

  if (image_path.includes("\\") || image_path.includes("%2e") || image_path.includes("%2E")) {
    return { ok: false, reason: "path_traversal" };
  }

  if (image_path.startsWith("/")) return { ok: false, reason: "path_traversal" };

  const parts = image_path.split("/");
  if (parts[0] !== ALLOWED_BUCKET) return { ok: false, reason: "invalid_bucket" };
  if (parts[1] !== userId) return { ok: false, reason: "user_mismatch" };
  if (parts.length < 3) return { ok: false, reason: "no_filename" };

  for (let i = 1; i < parts.length; i++) {
    if (FORBIDDEN_SEGMENTS.has(parts[i])) {
      return { ok: false, reason: i === parts.length - 1 ? "no_filename" : "path_traversal" };
    }
  }

  return { ok: true, bucket: ALLOWED_BUCKET, filePath: parts.slice(1).join("/") };
}
