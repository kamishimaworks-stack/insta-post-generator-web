export type ExtractCaptionResult =
  | { ok: true; caption: string; hashtags: string }
  | { ok: false; reason: "no_content" | "invalid_input" | "parse_failed" };

type Block = { type?: string; input?: { caption?: unknown; hashtags?: unknown }; text?: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function tryParseJson(raw: string): { caption?: unknown; hashtags?: unknown } | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

export function extractCaptionFromContent(content: unknown): ExtractCaptionResult {
  if (!Array.isArray(content)) return { ok: false, reason: "invalid_input" };
  if (content.length === 0) return { ok: false, reason: "no_content" };

  const blocks = content as Block[];

  const toolUse = blocks.find((b) => b?.type === "tool_use");
  if (toolUse?.input) {
    const c = toolUse.input.caption;
    const h = toolUse.input.hashtags;
    if (isNonEmptyString(c) && isNonEmptyString(h)) {
      return { ok: true, caption: c, hashtags: h };
    }
  }

  const textBlock = blocks.find((b) => b?.type === "text");
  if (textBlock?.text) {
    const fenced = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/);
    const candidate = fenced ? fenced[1] : textBlock.text;
    const parsed = tryParseJson(candidate);
    if (parsed && isNonEmptyString(parsed.caption) && isNonEmptyString(parsed.hashtags)) {
      return { ok: true, caption: parsed.caption, hashtags: parsed.hashtags };
    }
  }

  return { ok: false, reason: "parse_failed" };
}
