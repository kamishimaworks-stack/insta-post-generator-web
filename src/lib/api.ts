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
  pastHashtags: string,
  accountName?: string,
  targetAudience?: string,
  purpose?: string,
  genre?: string,
  followerScale?: string,
  competitors?: string
): Promise<StyleAnalysisResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "ログインしてください" },
    };
  }

  const commonBody = {
    account_name: accountName?.trim() || "",
    target_audience: targetAudience?.trim() || "",
    purpose: purpose?.trim() || "",
    genre: genre?.trim() || "",
    follower_scale: followerScale?.trim() || "",
    competitors: competitors?.trim() || "",
  };

  // 2つのEdge Functionを並列で呼び出し（タイムアウト回避）
  const [toneResult, hashtagResult] = await Promise.all([
    supabase.functions.invoke("analyze-tone", {
      body: {
        past_posts: pastPosts.filter((p) => p.trim().length > 0),
        ...commonBody,
      },
    }),
    supabase.functions.invoke("analyze-hashtags", {
      body: {
        past_hashtags: pastHashtags.trim(),
        ...commonBody,
      },
    }),
  ]);

  if (toneResult.error) {
    console.error("analyze-tone error:", toneResult.error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `トーン分析に失敗しました: ${toneResult.error.message || "不明なエラー"}`,
      },
    };
  }

  if (hashtagResult.error) {
    console.error("analyze-hashtags error:", hashtagResult.error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `ハッシュタグ分析に失敗しました: ${hashtagResult.error.message || "不明なエラー"}`,
      },
    };
  }

  return {
    success: true,
    data: {
      tone_analysis: toneResult.data?.data?.tone_analysis ?? "",
      hashtag_strategy: hashtagResult.data?.data?.hashtag_strategy ?? "",
    },
  };
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
