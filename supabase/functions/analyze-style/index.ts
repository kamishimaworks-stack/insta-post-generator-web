import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    const { past_posts, past_hashtags, account_name, target_audience, purpose } = body;

    const validPosts = Array.isArray(past_posts)
      ? past_posts.filter((p: string) => p?.trim?.())
      : [];
    const hasValidPosts = validPosts.length >= 5;
    const hasValidHashtags = !!past_hashtags?.trim();

    const accountInfo = {
      account_name: account_name || "",
      target_audience: target_audience || "",
      purpose: purpose || "",
    };

    const toneAnalysis = hasValidPosts
      ? await analyzeTone(past_posts, accountInfo)
      : await generateToneFromProfile(accountInfo);

    const hashtagStrategy = hasValidHashtags
      ? await analyzeHashtags(past_hashtags, accountInfo)
      : await generateHashtagsFromProfile(accountInfo);

    return jsonResponse(200, {
      success: true,
      data: {
        tone_analysis: toneAnalysis,
        hashtag_strategy: hashtagStrategy,
      },
    });
  } catch (e) {
    console.error("analyze-style error:", e);
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
};

async function analyzeTone(pastPosts: string[], accountInfo: AccountInfo): Promise<string> {
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
   - 文末表現のパターンと出現頻度（例:「〜だよね」が全体の30%等）
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
     （疑問形 / 衝撃事実 / 共感呼びかけ / 数字 / 逆張り / 煽り等）
   - 実際のフック例を全投稿から抽出
   - フックの平均文字数
   - 【改善提案】最初の1.7秒（≒冒頭1行）で視聴を止めるための最適化案

4. 投稿文の構造パターン
   - 全体構成のテンプレート化（例: フック → 共感 → 本題 → 具体例 → CTA）
   - 各ブロックの文字数目安
   - 全体の文字数傾向
   - 【改善提案】視聴時間とDMシェアを最大化する構造

5. CTA（行動喚起）の分析
   - 現在のCTAパターンと配置位置
   - 誘導先の種類（コメント / 保存 / フォロー / シェア / プロフィールリンク）
   - 【改善提案】2026年アルゴリズムではシェア(DM送信)が最重要。
     DMシェアを促すCTA表現の具体例を5つ以上提案

6. キーワードSEO最適化（2026年新規重要項目）
   - 現在のキャプションにおけるキーワード使用状況
   - 【改善提案】キャプション冒頭125文字以内に主要キーワードを配置する方法
   - 検索されやすいキーワードの自然な組み込み方
   - Google検索からの流入も意識したキーワード配置

7. エンゲージメント最大化テクニック
   - 現在使っている読者参加型要素の分析
   - 【改善提案】保存したくなる有益情報の提示法
   - 【改善提案】コメントを促す質問・投げかけの具体例
   - 【改善提案】「友達にシェアしたくなる」要素の組み込み方

8. トーン・世界観の定義
   - 全体的な雰囲気の言語化
   - 読者との距離感（友達 / 先輩 / 先生 / 同僚）
   - ユーモアの種類と頻度
   - 使ってはいけないNG表現・トーン

━━━━━━━━━━━━━━━━━━━━━━
【出力ルール】
━━━━━━━━━━━━━━━━━━━━━━
- 「〜してください」「〜を使うこと」の命令形で書く
- 各項目に具体例を必ず含める
- 「適度に」「時々」等の曖昧表現は禁止。数値や具体例で示す
- 現状の分析と2026年アルゴリズム対応の改善提案を明確に区別する
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

async function analyzeHashtags(pastHashtags: string, accountInfo: AccountInfo): Promise<string> {
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
- ビジネスアカウントの投稿がGoogleにインデックスされるようになった

━━━━━━━━━━━━━━━━━━━━━━
【あなたのタスク】
━━━━━━━━━━━━━━━━━━━━━━
過去のハッシュタグを分析し、2026年アルゴリズムに最適化された「ハッシュタグ＋キーワードSEO統合戦略書」を作成してください。
もはやハッシュタグだけの戦略は時代遅れです。キーワードSEOとの統合が必須です。

━━━━━━━━━━━━━━━━━━━━━━
【必須分析・提案項目】
━━━━━━━━━━━━━━━━━━━━━━

1. 過去のハッシュタグ分析
   - カテゴリ分類（ブランド / 業界 / ターゲット層 / トレンド / 地域）
   - 効果的だったと推測されるタグとその理由
   - 効果が薄いと推測されるタグとその理由

2. 2026年最適ハッシュタグ戦略
   - 固定で使うべきブランドタグ（1〜2個）とその理由
   - テーマに応じて使い分けるニッチタグ（2〜3個のローテーション案）
   - 合計3〜5個に厳選する基準
   - 絶対に使うべきでないタグの傾向
   - 配置位置（キャプション末尾 vs 最初のコメント）の推奨

3. キーワードSEO戦略（これが本命）
   - このアカウントが狙うべき主要キーワード10個以上
   - キャプション冒頭125文字に配置すべき最重要キーワード3つ
   - キーワードの自然な組み込み方（不自然なキーワード詰め込みはNG）
   - Google検索も意識したキーワード選定
   - 各投稿テーマごとのキーワードテンプレート

4. テーマ別タグ＋キーワードテンプレート
   - 投稿テーマ別に「ハッシュタグ3〜5個 + キャプション用キーワード」のセットを3パターン以上
   - 例:「日常紹介」「商品/サービス紹介」「教育/How-to」等

5. 運用ルール
   - 1投稿あたりのハッシュタグ数: 3〜5個（厳守）
   - 同じタグセットの連続使用は避ける（ローテーション）
   - トレンドタグの取り入れ方
   - 効果測定の方法

━━━━━━━━━━━━━━━━━━━━━━
【出力ルール】
━━━━━━━━━━━━━━━━━━━━━━
- 投稿文生成AIに渡す指示書として出力
- 具体的なタグ名・キーワードを多数含める
- ハッシュタグは3〜5個に厳選する方針を明確にする
- キーワードSEOの指示を必ず含める
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
                  "ハッシュタグ＋キーワードSEO統合戦略の指示書。2026年アルゴリズム対応。最低1500文字。",
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
          content: `以下の過去に使用したハッシュタグを分析し、2026年最新アルゴリズムに最適化されたハッシュタグ＋キーワードSEO統合戦略書を作成してください。\n\n${pastHashtags}`,
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
  return textBlock?.text ?? "";
}

async function generateToneFromProfile(accountInfo: AccountInfo): Promise<string> {
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
与えられたアカウント情報（アカウント名、ターゲット層、投稿目的）から、
このアカウントに最適な文体・トーンの指示書を新規作成してください。

━━━━━━━━━━━━━━━━━━━━━━
【2026年 Instagramアルゴリズムの核心知識】
━━━━━━━━━━━━━━━━━━━━━━
- 最重要シグナル: ①視聴時間 ②いいね/リーチ比率 ③シェア(DM送信)/リーチ比率
- シェア(DM送信)が新規リーチ獲得に最も強力
- 最初の1.7秒でユーザーが離脱を判断
- キャプション内のキーワードがハッシュタグより発見性で重要

━━━━━━━━━━━━━━━━━━━━━━
【指示書に含めるべき項目】
━━━━━━━━━━━━━━━━━━━━━━
1. 推奨する文体（敬語レベル、文末表現）— ターゲット層に合わせる
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
                description: "文体・トーンに関する詳細な指示書。最低2000文字。",
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

async function generateHashtagsFromProfile(accountInfo: AccountInfo): Promise<string> {
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
      system: `あなたはInstagramのハッシュタグSEO戦略とキーワードSEOの専門家です。
2026年最新のInstagramアルゴリズムに精通しています。

ユーザーはまだハッシュタグの使用実績がありません。
与えられたアカウント情報（アカウント名、ターゲット層、投稿目的）から、
このアカウントに最適なハッシュタグ＋キーワードSEO統合戦略書を新規作成してください。

━━━━━━━━━━━━━━━━━━━━━━
【2026年 ハッシュタグの最新事実】
━━━━━━━━━━━━━━━━━━━━━━
- Instagram公式推奨: 3〜5個に厳選
- ハッシュタグフォロー機能は廃止済み
- キャプション内キーワードSEOが発見性で圧倒的に重要
- ビジネスアカウントの投稿はGoogleにインデックスされる

━━━━━━━━━━━━━━━━━━━━━━
【指示書に含めるべき項目】
━━━━━━━━━━━━━━━━━━━━━━
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
                description: "ハッシュタグ＋キーワードSEO統合戦略の指示書。最低1500文字。",
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
          content: `以下のアカウント情報を元に、このアカウントに最適なハッシュタグ＋キーワードSEO統合戦略書を新規作成してください。

- アカウント名: ${accountInfo.account_name}
- ターゲット層: ${accountInfo.target_audience}
- 投稿の目的: ${accountInfo.purpose}

※ 過去のハッシュタグ使用実績はありません。ターゲット層と目的に最適化された戦略を提案してください。`,
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
  return textBlock?.text ?? "";
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
