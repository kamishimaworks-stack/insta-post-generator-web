"use client";

type Props = {
  readonly status: "uploading" | "generating" | "analyzing";
};

const messages = {
  uploading: "画像をアップロード中...",
  generating: "投稿文を生成中...",
  analyzing: "文体を分析中...",
} as const;

export function LoadingOverlay({ status }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563EB]" />
        <p className="text-base font-medium text-gray-700">
          {messages[status]}
        </p>
      </div>
    </div>
  );
}
