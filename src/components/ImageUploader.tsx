"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  readonly imagePreviews: string[];
  readonly onImagesSelect: (files: File[]) => void;
  readonly onRemoveImage: (index: number) => void;
  readonly maxImages?: number;
};

export function ImageUploader({
  imagePreviews,
  onImagesSelect,
  onRemoveImage,
  maxImages = 10,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      const remaining = maxImages - imagePreviews.length;
      const toAdd = imageFiles.slice(0, remaining);
      if (toAdd.length > 0) onImagesSelect(toAdd);
    },
    [onImagesSelect, imagePreviews.length, maxImages]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFiles(Array.from(e.dataTransfer.files));
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
        // Reset input so same files can be re-added after removal
        e.target.value = "";
      }
    },
    [handleFiles]
  );

  const canAddMore = imagePreviews.length < maxImages;

  return (
    <div className="flex flex-col gap-3">
      {/* Grid of selected images */}
      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt={`選択された画像 ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemoveImage(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label={`画像 ${index + 1} を削除`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area — only shown when under max */}
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex h-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
            isDragOver
              ? "border-[#2563EB] bg-[#2563EB]/5"
              : "border-gray-300 bg-gray-50 hover:border-[#2563EB]/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs">クリックまたはドラッグ&ドロップ</p>
          </div>
        </div>
      )}

      {/* Count indicator */}
      <p className="text-right text-xs text-gray-400">
        {imagePreviews.length}/{maxImages}枚
      </p>
    </div>
  );
}
