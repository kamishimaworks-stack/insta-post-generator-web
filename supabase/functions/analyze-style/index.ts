import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 認証チェック
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, {
        success: false,
        error: { code: "UNAUTHORIZED", message: "認証が必要です" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const body = await req.json();
    const { past_posts, past_hashtags } = body;

    // バリデーション
    if (
      !Array.isArray(past_posts) ||
      past_posts.filter((p: string) => p?.trim?.()).length < 5
    ) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "過去の投稿文を5つ以上入力してください",
        },
      });
    }

    if (!past_hashtags?.trim()) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "ハッシュタグを入力してください",
        },
      });
    }

    // Claude APIで文体分析
    const toneAnalysis = await analyzeTone(past_posts);
    const hashtagStrategy = await analyzeHashtags(past_hashtags);

    return jsonResponse(200, {
      success: true,
      data: {
        tone_analysis: toneAnalysis,
        hashtag_strategy: hashtagStrategy,
      },
    });
  } catch {
    return jsonResponse(500, {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました" },
    });
  }
});

async function analyzeTone(pastPosts: string[]): Promise<string> {
  const postsText = pastPosts
    .filter((p) => p.trim())
    .map((p, i) => `【投稿${i + 1}】\n${p}`)
    .join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたはInstagramの投稿文を分析する専門家です。
与えられた過去の投稿文から、以下の要素を分析して、今後の投稿文生成に使うための具体的な指示文を作成してください。

分析項目:
1. 文体の特徴（敬語/タメ口、文末表現のパターン）
2. 絵文字の使い方（頻度、種類、配置パターン）
3. 改行の使い方
4. フックの手法（最初の1行の書き方）
5. CTAの入れ方
6. 全体的なトーン（カジュアル/フォーマル/エンタメ等）
7. 文章の構造パターン（導入→本文→CTA等）

出力形式:
簡潔で具体的な指示文として出力してください。「〜してください」「〜を使う」のような指示形式で、投稿文生成AIに渡すプロンプトとして使えるものにしてください。`,
      tools: [
        {
          name: "output_tone_analysis",
          description: "文体分析結果を構造化して出力する",
          input_schema: {
            type: "object",
            properties: {
              tone_instructions: {
                type: "string",
                description:
                  "文体・トーンに関する具体的な指示文。投稿文生成AIに渡すプロンプトとして使える形式。",
              },
            },
            required: ["tone_instructions"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "output_tone_analysis" },
      messages: [
        {
          role: "user",
          content: `以下の過去のInstagram投稿文を分析して、文体・トーンの特徴を抽出してください。\n\n${postsText}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const result = await response.json();
  const toolUseBlock = result.content.find(
    (block: { type: string }) => block.type === "tool_use"
  );

  if (toolUseBlock?.input?.tone_instructions) {
    return toolUseBlock.input.tone_instructions;
  }

  // フォールバック
  const textBlock = result.content.find(
    (block: { type: string }) => block.type === "text"
  );
  return textBlock?.text ?? "カジュアルなトーンで、絵文字を適度に使用する。";
}

async function analyzeHashtags(pastHashtags: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたはInstagramのハッシュタグ戦略の専門家です。
与えられた過去のハッシュタグから、以下を分析して最適なハッシュタグ戦略を提案してください。

分析項目:
1. 使用しているハッシュタグのカテゴリ分類
2. ボリューム帯の分布（大・中・小）
3. 固定で使うべきハッシュタグ
4. テーマに応じて変えるべきハッシュタグの方向性
5. 最適なハッシュタグ数

出力形式:
投稿文生成AIに渡すハッシュタグ戦略の指示文として出力してください。具体的なハッシュタグ例も含めてください。`,
      tools: [
        {
          name: "output_hashtag_strategy",
          description: "ハッシュタグ戦略を構造化して出力する",
          input_schema: {
            type: "object",
            properties: {
              hashtag_instructions: {
                type: "string",
                description:
                  "ハッシュタグ戦略に関する具体的な指示文。固定ハッシュタグ、カテゴリ別推奨タグ、数の指針を含む。",
              },
            },
            required: ["hashtag_instructions"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "output_hashtag_strategy" },
      messages: [
        {
          role: "user",
          content: `以下の過去に使用したハッシュタグを分析して、最適なハッシュタグ戦略を作成してください。\n\n${pastHashtags}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const result = await response.json();
  const toolUseBlock = result.content.find(
    (block: { type: string }) => block.type === "tool_use"
  );

  if (toolUseBlock?.input?.hashtag_instructions) {
    return toolUseBlock.input.hashtag_instructions;
  }

  const textBlock = result.content.find(
    (block: { type: string }) => block.type === "text"
  );
  return textBlock?.text ?? "5〜15個のハッシュタグを使用する。";
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
