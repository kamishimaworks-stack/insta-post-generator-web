import type { ValidationResult } from "@/types";

export const MAX_TASTE_LENGTH = 200;

export function validateTaste(taste: string): ValidationResult {
  const trimmed = taste.trim();
  if (trimmed.length === 0) {
    return { valid: true };
  }
  if (trimmed.length > MAX_TASTE_LENGTH) {
    return { valid: false, message: `テイストは${MAX_TASTE_LENGTH}文字以内で入力してください` };
  }
  return { valid: true };
}

export function validateTheme(theme: string): ValidationResult {
  const trimmed = theme.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: "テーマを入力してください" };
  }
  if (trimmed.length > 100) {
    return { valid: false, message: "テーマは100文字以内で入力してください" };
  }
  return { valid: true };
}

export function validateVideoDescription(description: string): ValidationResult {
  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: "動画の内容を入力してください" };
  }
  if (trimmed.length > 500) {
    return { valid: false, message: "動画の内容は500文字以内で入力してください" };
  }
  return { valid: true };
}

export function validateImageSize(sizeInBytes: number): ValidationResult {
  if (sizeInBytes <= 0) {
    return { valid: false, message: "画像ファイルが空です" };
  }
  if (sizeInBytes > 5 * 1024 * 1024) {
    return { valid: false, message: "画像は5MB以内にしてください" };
  }
  return { valid: true };
}

export function validateGenerateInput(
  theme: string,
  videoDescription: string,
  imageFile: File | null
): ValidationResult {
  const themeResult = validateTheme(theme);
  if (!themeResult.valid) return themeResult;

  const descResult = validateVideoDescription(videoDescription);
  if (!descResult.valid) return descResult;

  if (!imageFile) {
    return { valid: false, message: "画像を選択してください" };
  }

  const sizeResult = validateImageSize(imageFile.size);
  if (!sizeResult.valid) return sizeResult;

  return { valid: true };
}

export function validatePastPosts(posts: readonly string[]): ValidationResult {
  const nonEmpty = posts.filter((p) => p.trim().length > 0);
  if (nonEmpty.length < 5) {
    return { valid: false, message: "過去の投稿文を5つ以上入力してください" };
  }
  return { valid: true };
}
