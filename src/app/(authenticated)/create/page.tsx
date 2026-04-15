"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { validateTheme, validateVideoDescription, validateTaste } from "@/lib/validation";
import { uploadImages } from "@/lib/storage";
import { generateCaption } from "@/lib/api";
import { ImageUploader } from "@/components/ImageUploader";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function CreatePage() {
  const router = useRouter();
  const {
    theme,
    videoDescription,
    taste,
    imageFiles,
    imagePreviews,
    loadingStatus,
    errorMessage,
    setTheme,
    setVideoDescription,
    setTaste,
    addImageFiles,
    removeImage,
    setImagePaths,
    setResult,
    setLoadingStatus,
    setErrorMessage,
    resetInput,
  } = useGenerationStore();

  const handleGenerate = useCallback(async () => {
    setErrorMessage("");

    const themeValidation = validateTheme(theme);
    if (!themeValidation.valid) {
      setErrorMessage(themeValidation.message);
      return;
    }
    const descValidation = validateVideoDescription(videoDescription);
    if (!descValidation.valid) {
      setErrorMessage(descValidation.message);
      return;
    }
    const tasteValidation = validateTaste(taste);
    if (!tasteValidation.valid) {
      setErrorMessage(tasteValidation.message);
      return;
    }

    try {
      let paths: string[] = [];

      // 画像がある場合のみアップロード
      if (imageFiles.length > 0) {
        setLoadingStatus("uploading");
        paths = await uploadImages(imageFiles);
        setImagePaths(paths);
      }

      // Generate caption
      setLoadingStatus("generating");
      const result = await generateCaption(paths, theme, videoDescription, taste.trim() || undefined);

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
    taste,
    imageFiles,
    setErrorMessage,
    setLoadingStatus,
    setImagePaths,
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
            placeholder="例: 社内イベントの裏側を紹介"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            maxLength={100}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
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
            placeholder="例: 社内の様子を歩きながら紹介する動画。社員が笑顔で作業している様子も映っている。"
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
            maxLength={500}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-relaxed outline-none focus:border-[#2563EB]"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">
            投稿画像
            <span className="ml-1 font-normal text-gray-400">（任意・最大10枚）</span>
          </label>
          <ImageUploader
            imagePreviews={imagePreviews}
            onImagesSelect={addImageFiles}
            onRemoveImage={removeImage}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-600">
            テイスト（任意）
            <span className="ml-1 font-normal text-gray-400">
              ({taste.length}/200)
            </span>
          </label>
          <input
            type="text"
            placeholder="例: シュールに、誠実な感じで、採用を意識して"
            value={taste}
            onChange={(e) => setTaste(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base outline-none focus:border-[#2563EB]"
          />
        </div>

        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loadingStatus !== "idle"}
          className="rounded-xl bg-[#2563EB] py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
