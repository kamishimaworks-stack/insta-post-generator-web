"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { validateGenerateInput } from "@/lib/validation";
import { uploadImage } from "@/lib/storage";
import { generateCaption } from "@/lib/api";
import { ImageUploader } from "@/components/ImageUploader";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function CreatePage() {
  const router = useRouter();
  const {
    theme,
    videoDescription,
    imageFile,
    imagePreview,
    loadingStatus,
    errorMessage,
    setTheme,
    setVideoDescription,
    setImageFile,
    setImagePreview,
    setImagePath,
    setResult,
    setLoadingStatus,
    setErrorMessage,
    resetInput,
  } = useGenerationStore();

  const handleImageSelect = useCallback(
    (file: File) => {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    },
    [setImageFile, setImagePreview]
  );

  const handleGenerate = useCallback(async () => {
    setErrorMessage("");

    const validation = validateGenerateInput(theme, videoDescription, imageFile);
    if (!validation.valid) {
      setErrorMessage(validation.message);
      return;
    }

    try {
      // Upload image
      setLoadingStatus("uploading");
      const imagePath = await uploadImage(imageFile!);
      setImagePath(imagePath);

      // Generate caption
      setLoadingStatus("generating");
      const result = await generateCaption(imagePath, theme, videoDescription);

      if (!result.success) {
        setErrorMessage(result.error.message);
        setLoadingStatus("idle");
        return;
      }

      setResult(result.data.caption, result.data.hashtags, result.data.image_analysis);
      setLoadingStatus("idle");
      router.push("/result");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "エラーが発生しました"
      );
      setLoadingStatus("idle");
    }
  }, [
    theme,
    videoDescription,
    imageFile,
    setErrorMessage,
    setLoadingStatus,
    setImagePath,
    setResult,
    router,
  ]);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {loadingStatus !== "idle" && (
        <LoadingOverlay
          status={loadingStatus as "uploading" | "generating"}
        />
      )}

      <h1 className="mb-6 text-2xl font-bold text-gray-900">投稿文を作成</h1>

      <div className="flex flex-col gap-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">
            テーマ
            <span className="ml-1 font-normal text-gray-400">
              ({theme.length}/100)
            </span>
          </label>
          <input
            type="text"
            placeholder="例: 工場見学の裏側を紹介"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#6C63FF]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">
            動画の内容
            <span className="ml-1 font-normal text-gray-400">
              ({videoDescription.length}/500)
            </span>
          </label>
          <textarea
            placeholder="例: 工場の製造ラインを歩きながら紹介する動画。社員が笑顔で作業している様子も映っている。"
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-relaxed outline-none focus:border-[#6C63FF]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">
            サムネイル画像
          </label>
          <ImageUploader
            imagePreview={imagePreview}
            onImageSelect={handleImageSelect}
          />
        </div>

        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loadingStatus !== "idle"}
          className="rounded-xl bg-[#6C63FF] py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          投稿文を生成
        </button>

        <button
          onClick={resetInput}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          入力をリセット
        </button>
      </div>
    </div>
  );
}
