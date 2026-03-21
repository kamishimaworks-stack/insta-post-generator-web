import { createClient } from "./supabase";

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxWidth = 1024;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const width = img.width * scale;
      const height = img.height * scale;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("画像の圧縮に失敗しました"));
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗しました"));
    };

    img.src = url;
  });
}

export async function uploadImage(file: File): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインしてください");

  const compressed = await compressImage(file);

  const maxSize = 5 * 1024 * 1024;
  if (compressed.size > maxSize) {
    throw new Error("画像は5MB以内にしてください");
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}-${randomSuffix}.jpg`;
  const filePath = `${user.id}/${fileName}`;

  const { error } = await supabase.storage
    .from("post-images")
    .upload(filePath, compressed, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw new Error("画像のアップロードに失敗しました");

  return `post-images/${filePath}`;
}
