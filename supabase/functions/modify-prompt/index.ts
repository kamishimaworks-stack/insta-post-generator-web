const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const { current_prompt, modification_request, prompt_type } = body;

    if (!current_prompt?.trim() || !modification_request?.trim()) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "プロンプトと修正リクエストは必須です",
        },
      });
    }

    if (!["tone", "hashtag"].includes(prompt_type)) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "prompt_typeはtoneまたはhashtagのみ有効です",
        },
      });
    }

    const typeLabel =
      prompt_type === "tone" ? "文体・トーン指示書" : "ハッシュタグ戦略書";

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
        system: `あなたはInstagram投稿文生成の${typeLabel}を修正する専門家です。

ユーザーから現在の指示書と修正リクエストが与えられます。
修正リクエストに基づいて指示書を修正し、修正後の完全な指示書を返してください。

ルール:
- 修正リクエストに関係ない部分は変更しない
- 指示書全体の品質と一貫性を維持する
- 修正後の指示書を完全な形で出力する（差分ではなく全文）
- 「〜してください」「〜を使うこと」の命令形を維持する`,
        tools: [
          {
            name: "output_modified_prompt",
            description: "修正後の指示書を出力する",
            input_schema: {
              type: "object",
              properties: {
                updated_prompt: {
                  type: "string",
                  description: "修正後の完全な指示書",
                },
              },
              required: ["updated_prompt"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "output_modified_prompt" },
        messages: [
          {
            role: "user",
            content: `以下の${typeLabel}を、修正リクエストに基づいて修正してください。

【現在の指示書】
${current_prompt}

【修正リクエスト】
${modification_request}`,
          },
        ],
      }),
    }, CLAUDE_TIMEOUT_MS);

    if (!response.ok)
      throw new Error(`Claude API error: ${response.status}`);

    const result = await response.json();
    const toolUseBlock = result.content.find(
      (block: { type: string }) => block.type === "tool_use"
    );

    if (toolUseBlock?.input?.updated_prompt) {
      return jsonResponse(200, {
        success: true,
        data: { updated_prompt: toolUseBlock.input.updated_prompt },
      });
    }

    const textBlock = result.content.find(
      (block: { type: string }) => block.type === "text"
    );
    if (textBlock?.text) {
      return jsonResponse(200, {
        success: true,
        data: { updated_prompt: textBlock.text },
      });
    }

    throw new Error("Failed to parse Claude response");
  } catch (e) {
    console.error("modify-prompt error:", e);
    return jsonResponse(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `サーバーエラー: ${e instanceof Error ? e.message : String(e)}`,
      },
    });
  }
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
