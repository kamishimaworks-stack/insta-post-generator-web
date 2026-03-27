"use client";

import { useState, useCallback } from "react";

type Props = {
  readonly text: string;
  readonly label: string;
};

export function CopyButton({ text, label }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
        copied
          ? "bg-green-500 text-white"
          : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
      }`}
    >
      {copied ? "コピーしました!" : label}
    </button>
  );
}
