"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  readonly imagePreview: string | null;
  readonly onImageSelect: (file: File) => void;
};

export function ImageUploader({ imagePreview, onImageSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onImageSelect(file);
    },
    [onImageSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
        isDragOver
          ? "border-[#6C63FF] bg-[#6C63FF]/5"
          : "border-gray-300 bg-gray-50 hover:border-[#6C63FF]/50"
      } ${imagePreview ? "h-auto" : "h-48"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {imagePreview ? (
        <img
          src={imagePreview}
          alt="選択された画像"
          className="max-h-64 rounded-lg object-contain p-2"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm">クリックまたはドラッグ&ドロップで画像を選択</p>
        </div>
      )}
    </div>
  );
}
