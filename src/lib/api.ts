import { createClient } from "./supabase";
import type { ApiResponse, StyleAnalysisResponse } from "@/types";

export async function generateCaption(
  imagePath: string,
  theme: string,
  videoDescription: string
): Promise<ApiResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "ログインしてください" },
    };
  }

  const { data, error } = await supabase.functions.invoke("generate-caption", {
    body: {
      image_path: imagePath,
      theme: theme.trim(),
      video_description: videoDescription.trim(),
    },
  });

  if (error) {
    console.error("generate-caption error:", error, "data:", data);
    if (data && typeof data === "object" && "error" in data) {
      return data as ApiResponse;
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `サーバーとの通信に失敗しました: ${error.message || "不明なエラー"}`,
      },
    };
  }

  return data as ApiResponse;
}

export async function analyzeStyle(
  pastPosts: readonly string[],
  pastHashtags: string
): Promise<StyleAnalysisResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "ログインしてください" },
    };
  }

  const { data, error } = await supabase.functions.invoke("analyze-style", {
    body: {
      past_posts: pastPosts.filter((p) => p.trim().length > 0),
      past_hashtags: pastHashtags.trim(),
    },
  });

  if (error) {
    console.error("analyze-style error:", error);
    // Edge Functionがエラーレスポンスを返した場合、dataにレスポンスが入っていることがある
    if (data && typeof data === "object" && "error" in data) {
      return data as StyleAnalysisResponse;
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `スタイル分析に失敗しました: ${error.message || "不明なエラー"}`,
      },
    };
  }

  return data as StyleAnalysisResponse;
}

export type ModifyPromptResponse = {
  readonly success: boolean;
  readonly data?: { readonly updated_prompt: string };
  readonly error?: { readonly code: string; readonly message: string };
};

export async function modifyPrompt(
  currentPrompt: string,
  modificationRequest: string,
  promptType: "tone" | "hashtag"
): Promise<ModifyPromptResponse> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "ログインしてください" },
    };
  }

  const { data, error } = await supabase.functions.invoke("modify-prompt", {
    body: {
      current_prompt: currentPrompt,
      modification_request: modificationRequest,
      prompt_type: promptType,
    },
  });

  if (error) {
    console.error("modify-prompt error:", error);
    if (data && typeof data === "object" && "error" in data) {
      return data as ModifyPromptResponse;
    }
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `プロンプト修正に失敗しました: ${error.message || "不明なエラー"}`,
      },
    };
  }

  return data as ModifyPromptResponse;
}
