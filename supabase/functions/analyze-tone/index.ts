const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { past_posts, account_name, target_audience, purpose, genre, follower_scale, competitors } = body;

    const accountInfo = {
      account_name: account_name || "",
      target_audience: target_audience || "",
      purpose: purpose || "",
      genre: genre || "",
      follower_scale: follower_scale || "",
      competitors: competitors || "",
    };

    const validPosts = Array.isArray(past_posts)
      ? past_posts.filter((p: string) => p?.trim?.())
      : [];
    const hasValidPosts = validPosts.length >= 5;

    const toneAnalysis = hasValidPosts
      ? await analyzeTone(validPosts, accountInfo)
      : await generateToneFromProfile(accountInfo);

    return jsonResponse(200, {
      success: true,
      data: { tone_analysis: toneAnalysis },
    });
  } catch (e) {
    console.error("analyze-tone error:", e);
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

async function analyzeTone(
  pastPosts: string[],
  accountInfo: AccountInfo
): Promise<string> {
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
      max_tokens: 4096,
      system: `あなたはInstagramリール投稿文の分析と最適化の世界的権威です。
2026年最新のInstagramアルゴリズムに精通しています。

━━━━━━━━━━━━━━━━━━━━━━
【2026年 Instagramアルゴリズムの核心知識】
━━━━━━━━━━━━━━━━━━━━━━
- 最重要シグナル: ①視聴時間 ②いいね/リーチ比率 ③シェア(DM送信)/リーチ比率
- シェア(DM送信)が新規リーチ獲得に最も強力（Adam Mosseri公式発言）
- 保存数はコンテンツの価値を示す強シグナル
- コメントは4語以上の長文コメントが深いエンゲージメントとして評価される
- いいねはバニティメトリクス扱いで優先度が低い
- 最初の1.7秒でユーザーが「見るかスクロールするか」決定する
- 投稿後1時間以内のエンゲージメントが爆発的にリーチを増幅する
- キャプション内のキーワードがハッシュタグより発見性で重要（キーワードSEO時代）
- ビジネス/クリエイターアカウントの投稿はGoogleにもインデックスされる
- オリジナルコンテンツが大幅に優遇される

━━━━━━━━━━━━━━━━━━━━━━
【あなたのタスク】
━━━━━━━━━━━━━━━━━━━━━━
与えられた過去の投稿文を徹底分析し、「このアカウントの投稿文をAIが生成する際に、本人が書いたように完全再現するための詳細指示書」を作成してください。
さらに、2026年最新アルゴリズムに基づいて、文体を維持しながらエンゲージメントを最大化するための改善提案も含めてください。

━━━━━━━━━━━━━━━━━━━━━━
【必須分析項目 — すべて具体例付きで記述】
━━━━━━━━━━━━━━━━━━━━━━

1. 文体の基本特性
   - 敬語レベル（です・ます / タメ口 / ミックス）の比率を具体的に
   - 文末表現のパターンと出現頻度
   - 一文の平均的な長さと文のリズム感
   - 体言止めの使用頻度と効果的な位置

2. 絵文字・記号・装飾の詳細パターン
   - 1投稿あたりの平均使用数
   - よく使う絵文字のリスト（上位10個）
   - 配置の法則（見出しの前、文末、区切り等）
   - 装飾記号のパターン（【】「」＼／━ ・→ 等）
   - 改行の入れ方と空行の使い方

3. フック（冒頭1〜2行）の手法分析
   - 使用しているフックパターンの分類と頻度
   - 実際のフック例を全投稿から抽出
   - フックの平均文字数
   - 【改善提案】最初の1.7秒で視聴を止めるための最適化案

4. 投稿文の構造パターン
   - 全体構成のテンプレート化
   - 各ブロックの文字数目安
   - 全体の文字数傾向
   - 【改善提案】視聴時間とDMシェアを最大化する構造

5. CTA（行動喚起）の分析
   - 現在のCTAパターンと配置位置
   - 誘導先の種類
   - 【改善提案】DMシェアを促すCTA表現の具体例を5つ以上提案

6. キーワードSEO最適化
   - 現在のキャプションにおけるキーワード使用状況
   - 【改善提案】キャプション冒頭125文字以内に主要キーワードを配置する方法

7. エンゲージメント最大化テクニック
   - 現在使っている読者参加型要素の分析
   - 【改善提案】保存・コメント・シェアを促す要素

8. トーン・世界観の定義
   - 全体的な雰囲気の言語化
   - 読者との距離感
   - ユーモアの種類と頻度
   - 使ってはいけないNG表現・トーン

━━━━━━━━━━━━━━━━━━━━━━
【出力ルール】
━━━━━━━━━━━━━━━━━━━━━━
- 「〜してください」「〜を使うこと」の命令形で書く
- 各項目に具体例を必ず含める
- 「適度に」「時々」等の曖昧表現は禁止。数値や具体例で示す
- 最低2000文字以上で詳細に記述する`,
      tools: [
        {
          name: "output_tone_analysis",
          description: "文体分析結果を詳細な指示書として出力する",
          input_schema: {
            type: "object",
            properties: {
              tone_instructions: {
                type: "string",
                description:
                  "文体・トーンに関する詳細な指示書。2026年アルゴリズム対応の改善提案を含む。最低2000文字。",
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
          content: `以下の過去のInstagram投稿文を徹底分析して、2026年最新アルゴリズムに最適化された文体プロファイル（指示書）を作成してください。\n\n${postsText}`,
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
  const textBlock = result.content.find(
    (block: { type: string }) => block.type === "text"
  );
  return textBlock?.text ?? "";
}

async function generateToneFromProfile(
  accountInfo: AccountInfo
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: `あなたはInstagramリール投稿文のスタイル設計の専門家です。
2026年最新のInstagramアルゴリズムに精通しています。

ユーザーはまだ投稿実績がないため、過去の投稿文がありません。
与えられたアカウント情報から、このアカウントに最適な文体・トーンの指示書を新規作成してください。

【指示書に含めるべき項目】
1. 推奨する文体（敬語レベル、文末表現）
2. 絵文字の使い方（頻度、種類、配置）
3. フック（冒頭1行）のパターン例を5つ以上
4. 投稿文の構造テンプレート
5. CTA（行動喚起）の具体例 — DMシェア誘導を最優先
6. キーワードSEOの組み込み方
7. 全体的なトーン・世界観の定義
8. 投稿文の文字数目安

出力は「〜してください」「〜を使うこと」の命令形で書く。
最低2000文字以上の詳細な指示書を作成すること。`,
      tools: [
        {
          name: "output_tone_analysis",
          description: "文体指示書を出力する",
          input_schema: {
            type: "object",
            properties: {
              tone_instructions: {
                type: "string",
                description:
                  "文体・トーンに関する詳細な指示書。最低2000文字。",
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
          content: `以下のアカウント情報を元に、このアカウントに最適な文体・トーンの指示書を新規作成してください。

- アカウント名: ${accountInfo.account_name}
- ターゲット層: ${accountInfo.target_audience}
- 投稿の目的: ${accountInfo.purpose}
- ジャンル: ${accountInfo.genre}
- フォロワー規模: ${accountInfo.follower_scale}
- 競合アカウント: ${accountInfo.competitors}

※ 過去の投稿実績はありません。ターゲット層と目的に最適化された文体を提案してください。`,
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
