import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_LIMIT = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "認証が必要です" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "認証トークンが無効です" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { image_path, theme, video_description, taste } = body;

    // Validation (image_path is optional)
    if (!theme?.trim() || !video_description?.trim()) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "必須項目が入力されていません",
        },
      });
    }

    if (theme.length > 100 || video_description.length > 500) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "入力文字数が上限を超えています",
        },
      });
    }

    if (taste && taste.length > 200) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "テイストは200文字以内で入力してください",
        },
      });
    }

    // Rate limit check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    if ((count ?? 0) >= DAILY_LIMIT) {
      return jsonResponse(429, {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "本日の生成上限（30回）に達しました",
        },
      });
    }

    // Step 1: Image analysis (optional)
    let imageAnalysis = "";
    if (image_path) {
      const bucketName = image_path.split("/")[0];
      const filePath = image_path.split("/").slice(1).join("/");
      const { data: imageData, error: storageError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (storageError || !imageData) {
        return jsonResponse(400, {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "画像が見つかりません" },
        });
      }

      const imageBytes = new Uint8Array(await imageData.arrayBuffer());
      let binary = "";
      for (let i = 0; i < imageBytes.length; i++) {
        binary += String.fromCharCode(imageBytes[i]);
      }
      const base64Image = btoa(binary);

      // Gemini image analysis (1 retry)
      try {
        imageAnalysis = await analyzeImageWithGemini(base64Image);
      } catch {
        try {
          imageAnalysis = await analyzeImageWithGemini(base64Image);
        } catch {
          return jsonResponse(502, {
            success: false,
            error: {
              code: "IMAGE_ANALYSIS_FAILED",
              message: "画像の分析に失敗しました",
            },
          });
        }
      }
    }

    // Step 2: Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Step 3: Claude caption generation (1 retry)
    let generationResult: { caption: string; hashtags: string };
    try {
      generationResult = await generateWithClaude(
        profile,
        theme.trim(),
        video_description.trim(),
        imageAnalysis,
        taste?.trim() || null
      );
    } catch {
      try {
        generationResult = await generateWithClaude(
          profile,
          theme.trim(),
          video_description.trim(),
          imageAnalysis,
          taste?.trim() || null
        );
      } catch {
        return jsonResponse(502, {
          success: false,
          error: {
            code: "GENERATION_FAILED",
            message: "文章の生成に失敗しました",
          },
        });
      }
    }

    // Save to DB
    await supabase.from("generations").insert({
      user_id: user.id,
      theme: theme.trim(),
      video_description: video_description.trim(),
      taste: taste?.trim() || null,
      image_path: image_path || null,
      image_analysis: imageAnalysis || null,
      generated_caption: generationResult.caption,
      generated_hashtags: generationResult.hashtags,
    });

    return jsonResponse(200, {
      success: true,
      data: {
        caption: generationResult.caption,
        hashtags: generationResult.hashtags,
        image_analysis: imageAnalysis,
      },
    });
  } catch {
    return jsonResponse(500, {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました" },
    });
  }
});

async function analyzeImageWithGemini(
  base64Image: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "この画像に映っているものを簡潔に日本語で説明してください。人物の特徴、場所、行動、雰囲気を含めてください。",
              },
              {
                inline_data: { mime_type: "image/jpeg", data: base64Image },
              },
            ],
          },
        ],
      }),
    }
  );
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  const result = await response.json();
  return result.candidates[0].content.parts[0].text;
}

async function generateWithClaude(
  profile: {
    account_name: string;
    target_audience: string;
    purpose: string;
    tone: string;
    fixed_hashtags: string;
    custom_instructions: string;
  } | null,
  theme: string,
  videoDescription: string,
  imageAnalysis: string,
  taste: string | null
): Promise<{ caption: string; hashtags: string }> {
  const systemPrompt = `あなたはInstagramのリール投稿文を作成する専門家です。

【アカウント情報】
- アカウント名: ${profile?.account_name || ""}
- ターゲット: ${profile?.target_audience || ""}
- 目的: ${profile?.purpose || ""}
- トーン: ${profile?.tone || ""}
- 固定ハッシュタグ: ${profile?.fixed_hashtags || ""}
- その他指示: ${profile?.custom_instructions || ""}

【Instagram SEOルール】
- 投稿文は最初の1行がフックになること（スクロールを止める一言）
- ハッシュタグは5〜15個、大・中・小のボリュームを混ぜる
- CTA（コメント誘導、保存誘導）を含める
- 改行を適度に使い読みやすくする`;

  const tasteLine = taste ? `\n- この動画のテイスト: ${taste}` : "";
  const imageLine = imageAnalysis
    ? `\n- 画像から読み取れる内容: ${imageAnalysis}`
    : "";

  const userMessage = `以下の情報を元に、リールが回る投稿文とハッシュタグを生成してください。

- テーマ: ${theme}
- 動画内容: ${videoDescription}${imageLine}${tasteLine}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6-20260319",
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        {
          name: "generate_post",
          description: "Instagram投稿文とハッシュタグを生成する",
          input_schema: {
            type: "object",
            properties: {
              caption: {
                type: "string",
                description: "Instagram投稿文（本文）",
              },
              hashtags: {
                type: "string",
                description: "ハッシュタグ（スペース区切り）",
              },
            },
            required: ["caption", "hashtags"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "generate_post" },
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const result = await response.json();

  // Extract JSON from tool_use response
  const toolUseBlock = result.content.find(
    (block: { type: string }) => block.type === "tool_use"
  );
  if (toolUseBlock?.input?.caption && toolUseBlock?.input?.hashtags) {
    return {
      caption: toolUseBlock.input.caption,
      hashtags: toolUseBlock.input.hashtags,
    };
  }

  // Fallback: extract JSON from text
  const textBlock = result.content.find(
    (block: { type: string }) => block.type === "text"
  );
  if (textBlock?.text) {
    const jsonMatch = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : textBlock.text;
    const parsed = JSON.parse(jsonStr);
    return { caption: parsed.caption, hashtags: parsed.hashtags };
  }

  throw new Error("Failed to parse Claude response");
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
