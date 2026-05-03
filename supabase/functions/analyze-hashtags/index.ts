const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatAccountInfo, type AccountInfo as SharedAccountInfo } from "../_shared/account-info.ts";
import { fetchWithTimeout } from "../_shared/retry.ts";

const CLAUDE_TIMEOUT_MS = 45000;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const { past_hashtags, account_name, target_audience, purpose, genre, follower_scale, competitors } = body;

    const accountInfo = {
      account_name: account_name || "",
      target_audience: target_audience || "",
      purpose: purpose || "",
      genre: genre || "",
      follower_scale: follower_scale || "",
      competitors: competitors || "",
    };

    const hasValidHashtags = !!past_hashtags?.trim();

    const hashtagStrategy = hasValidHashtags
      ? await analyzeHashtags(past_hashtags, accountInfo)
      : await generateHashtagsFromProfile(accountInfo);

    return jsonResponse(200, {
      success: true,
      data: { hashtag_strategy: hashtagStrategy },
    });
  } catch (e) {
    console.error("analyze-hashtags error:", e);
    return jsonResponse(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}`,
      },
    });
  }
});

type AccountInfo = {
  account_name: string;
  target_audience: string;
  purpose: string;
  genre: string;
  follower_scale: string;
  competitors: string;
};

async function analyzeHashtags(
  pastHashtags: string,
  accountInfo: AccountInfo
): Promise<string> {
  const infoBlock = formatAccountInfo(accountInfo as SharedAccountInfo);
  const userMessage = infoBlock
    ? `${infoBlock}\n\n以下は過去に使用したハッシュタグです。これらの傾向を活かしつつ、上記アカウントの目的・ジャンルに最適化された2026年最新アルゴリズム対応のハッシュタグ＋キーワードSEO統合戦略書を作成してください。\n\n${pastHashtags}`
    : `以下の過去に使用したハッシュタグを分析し、2026年最新アルゴリズムに最適化されたハッシュタグ＋キーワードSEO統合戦略書を作成してください。\n\n${pastHashtags}`;

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `あなたはInstagramのハッシュタグSEO戦略とキーワードSEOの専門家です。
2026年最新のInstagramアルゴリズム変更に精通しています。

━━━━━━━━━━━━━━━━━━━━━━
【2026年 ハッシュタグに関する最新事実】
━━━━━━━━━━━━━━━━━━━━━━
- 2024年12月: ハッシュタグのフォロー機能が廃止された
- ハッシュタグはランキングシグナルとしての優先度が大幅に低下
- Instagramは「キーワードベースの関連性」にシフト
- Instagram公式Creatorsアカウントが推奨するハッシュタグ数は3〜5個
- 5個を超えるとリーチに悪影響との報告あり
- 20個以上は低品質シグナルとして扱われるリスク
- キャプション内のキーワードSEOがハッシュタグより発見性で圧倒的に重要

━━━━━━━━━━━━━━━━━━━━━━
【あなたのタスク】
━━━━━━━━━━━━━━━━━━━━━━
過去のハッシュタグを分析し、2026年アルゴリズムに最適化された「ハッシュタグ＋キーワードSEO統合戦略書」を作成してください。

━━━━━━━━━━━━━━━━━━━━━━
【必須分析・提案項目】
━━━━━━━━━━━━━━━━━━━━━━

1. 過去のハッシュタグ分析
   - カテゴリ分類（ブランド / 業界 / ターゲット層 / トレンド / 地域）
   - 効果的だったと推測されるタグとその理由
   - 効果が薄いと推測されるタグとその理由

2. 2026年最適ハッシュタグ戦略
   - 固定で使うべきブランドタグ（1〜2個）
   - テーマに応じて使い分けるニッチタグ（2〜3個のローテーション案）
   - 合計3〜5個に厳選する基準
   - 配置位置の推奨

3. キーワードSEO戦略
   - このアカウントが狙うべき主要キーワード10個以上
   - キャプション冒頭125文字に配置すべき最重要キーワード3つ
   - キーワードの自然な組み込み方

4. テーマ別タグ＋キーワードテンプレート
   - 投稿テーマ別に「ハッシュタグ3〜5個 + キャプション用キーワード」のセットを3パターン以上

5. 運用ルール
   - 1投稿あたりのハッシュタグ数: 3〜5個（厳守）
   - ローテーション、トレンドタグの取り入れ方

━━━━━━━━━━━━━━━━━━━━━━
【出力ルール】
━━━━━━━━━━━━━━━━━━━━━━
- 投稿文生成AIに渡す指示書として出力
- 具体的なタグ名・キーワードを多数含める
- 最低1500文字以上で詳細に記述する`,
      tools: [
        {
          name: "output_hashtag_strategy",
          description:
            "ハッシュタグ＋キーワードSEO統合戦略を指示書として出力する",
          input_schema: {
            type: "object",
            properties: {
              hashtag_instructions: {
                type: "string",
                description:
                  "ハッシュタグ＋キーワードSEO統合戦略の指示書。最低1500文字。",
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
          content: userMessage,
        },
      ],
    }),
  }, CLAUDE_TIMEOUT_MS);

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
  return textBlock?.text ?? "";
}

async function generateHashtagsFromProfile(
  accountInfo: AccountInfo
): Promise<string> {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `あなたはInstagramのハッシュタグSEO戦略とキーワードSEOの専門家です。
2026年最新のInstagramアルゴリズムに精通しています。

ユーザーはまだハッシュタグの使用実績がありません。
与えられたアカウント情報から、最適なハッシュタグ＋キーワードSEO統合戦略書を新規作成してください。

【指示書に含めるべき項目】
1. 推奨する固定ブランドタグ（1〜2個）
2. テーマ別ハッシュタグテンプレート（3パターン以上、各3〜5個）
3. 狙うべきキーワード10個以上
4. キャプション冒頭に配置すべきキーワード
5. 運用ルール（数、ローテーション、NG事項）

出力は「〜してください」「〜を使うこと」の命令形で書く。
最低1500文字以上の詳細な戦略書を作成すること。`,
      tools: [
        {
          name: "output_hashtag_strategy",
          description: "ハッシュタグ戦略書を出力する",
          input_schema: {
            type: "object",
            properties: {
              hashtag_instructions: {
                type: "string",
                description:
                  "ハッシュタグ＋キーワードSEO統合戦略の指示書。最低1500文字。",
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
          content: `以下のアカウント情報を元に、最適なハッシュタグ＋キーワードSEO統合戦略書を新規作成してください。

- アカウント名: ${accountInfo.account_name}
- ターゲット層: ${accountInfo.target_audience}
- 投稿の目的: ${accountInfo.purpose}
- ジャンル: ${accountInfo.genre}
- フォロワー規模: ${accountInfo.follower_scale}
- 競合アカウント: ${accountInfo.competitors}

※ 過去のハッシュタグ使用実績はありません。`,
        },
      ],
    }),
  }, CLAUDE_TIMEOUT_MS);

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
  return textBlock?.text ?? "";
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
