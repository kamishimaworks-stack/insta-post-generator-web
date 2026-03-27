"use client";

import { useRouter } from "next/navigation";
import { useGenerationStore } from "@/stores/useGenerationStore";
import { generateCaption } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function ResultPage() {
  const router = useRouter();
  const {
    caption,
    hashtags,
    imagePath,
    theme,
    videoDescription,
    taste,
    loadingStatus,
    setCaption,
    setHashtags,
    setResult,
    setLoadingStatus,
    setErrorMessage,
  } = useGenerationStore();

  const handleRegenerate = async () => {
    if (!imagePath || !theme || !videoDescription) return;

    setLoadingStatus("generating");
    try {
      const result = await generateCaption(imagePath, theme, videoDescription, taste.trim() || undefined);
      if (result.success) {
        setResult(result.data.caption, result.data.hashtags, result.data.image_analysis);
      } else {
        setErrorMessage(result.error.message);
      }
    } catch {
      setErrorMessage("再生成に失敗しました");
    }
    setLoadingStatus("idle");
  };

  if (!caption && !hashtags) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400">まだ生成結果がありません</p>
        <button
          onClick={() => router.push("/create")}
          className="rounded-xl bg-[#6C63FF] px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          投稿文を作成する
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {loadingStatus !== "idle" && (
        <LoadingOverlay status={loadingStatus as "uploading" | "generating"} />
      )}

      <h1 className="mb-6 text-2xl font-bold text-gray-900">生成結果</h1>

      <div className="flex flex-col gap-6">
        {/* Caption */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-600">
              キャプション
            </label>
            <CopyButton text={caption} label="コピー" />
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={10}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-relaxed outline-none focus:border-[#6C63FF]"
          />
        </div>

        {/* Hashtags */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-600">
              ハッシュタグ
            </label>
            <CopyButton text={hashtags} label="コピー" />
          </div>
          <textarea
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base leading-relaxed outline-none focus:border-[#6C63FF]"
          />
        </div>

        {/* Copy All */}
        <CopyButton
          text={`${caption}\n\n${hashtags}`}
          label="キャプション + ハッシュタグをコピー"
        />

        {/* Regenerate */}
        <button
          onClick={handleRegenerate}
          disabled={loadingStatus !== "idle"}
          className="rounded-xl border-2 border-[#6C63FF] py-3 text-base font-semibold text-[#6C63FF] transition-colors hover:bg-[#6C63FF]/5 disabled:opacity-50"
        >
          再生成する
        </button>

        {/* Back to create */}
        <button
          onClick={() => router.push("/create")}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          新しい投稿を作成
        </button>
      </div>
    </div>
  );
}
