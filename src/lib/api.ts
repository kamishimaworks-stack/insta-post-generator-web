import { createClient } from "./supabase";
import { withTimeout, TimeoutError } from "./with-timeout";
import type { ApiResponse, StyleAnalysisResponse } from "@/types";

const GENERATE_TIMEOUT_MS = 90_000;
const ANALYZE_TIMEOUT_MS = 90_000;
const MODIFY_TIMEOUT_MS = 60_000;

export async function generateCaption(
  imagePaths: string[],
  theme: string,
  videoDescription: string,
  taste?: string
): Promise<ApiResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "ログインしてください" },
    };
  }

  const body: Record<string, unknown> = {
    image_paths: imagePaths,
    theme: theme.trim(),
    video_description: videoDescription.trim(),
  };
  if (taste) {
    body.taste = taste.trim();
  }

  try {
    const { data, error, response } = await withTimeout(
      supabase.functions.invoke("generate-caption", { body }),
      GENERATE_TIMEOUT_MS,
    );

    if (error) {
      console.error("generate-caption error:", error);
      if (response) {
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
            return errorBody as ApiResponse;
          }
        } catch {
          // Response body already consumed or not JSON
        }
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
  } catch (err) {
    if (err instanceof TimeoutError) {
      return {
        success: false,
        error: { code: "TIMEOUT", message: "サーバーの応答がタイムアウトしました。もう一度お試しください。" },
      };
    }
    throw err;
  }
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

  try {
    // 2つのEdge Functionを並列で呼び出し（クライアント側タイムアウトでハング防止）
    const [toneResult, hashtagResult] = await withTimeout(
      Promise.all([
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
      ]),
      ANALYZE_TIMEOUT_MS,
    );

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

    type EdgeEnvelope<T> = {
      success?: boolean;
      data?: T;
      error?: { code?: string; message?: string };
    };
    const tonePayload = toneResult.data as EdgeEnvelope<{ tone_analysis?: string }> | null;
    const hashtagPayload = hashtagResult.data as EdgeEnvelope<{ hashtag_strategy?: string }> | null;

    if (tonePayload?.success === false) {
      console.error("analyze-tone returned success:false:", tonePayload.error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `トーン分析に失敗しました: ${tonePayload.error?.message || "不明なエラー"}`,
        },
      };
    }

    if (hashtagPayload?.success === false) {
      console.error("analyze-hashtags returned success:false:", hashtagPayload.error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: `ハッシュタグ分析に失敗しました: ${hashtagPayload.error?.message || "不明なエラー"}`,
        },
      };
    }

    const toneAnalysis = tonePayload?.data?.tone_analysis ?? "";
    const hashtagStrategy = hashtagPayload?.data?.hashtag_strategy ?? "";

    if (!toneAnalysis.trim() || !hashtagStrategy.trim()) {
      console.error("analyzeStyle empty result:", { tonePayload, hashtagPayload });
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "分析結果が空でした。もう一度お試しください。",
        },
      };
    }

    return {
      success: true,
      data: {
        tone_analysis: toneAnalysis,
        hashtag_strategy: hashtagStrategy,
      },
    };
  } catch (err) {
    if (err instanceof TimeoutError) {
      return {
        success: false,
        error: { code: "TIMEOUT", message: "分析の応答がタイムアウトしました。もう一度お試しください。" },
      };
    }
    throw err;
  }
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

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("modify-prompt", {
        body: {
          current_prompt: currentPrompt,
          modification_request: modificationRequest,
          prompt_type: promptType,
        },
      }),
      MODIFY_TIMEOUT_MS,
    );

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
  } catch (err) {
    if (err instanceof TimeoutError) {
      return {
        success: false,
        error: { code: "TIMEOUT", message: "応答がタイムアウトしました。もう一度お試しください。" },
      };
    }
    throw err;
  }
}
