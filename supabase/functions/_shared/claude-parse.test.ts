import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { extractCaptionFromContent } from "./claude-parse.ts";

describe("extractCaptionFromContent", () => {
  it("tool_use の input が完全なら採用", () => {
    const content = [
      { type: "tool_use", input: { caption: "本文", hashtags: "#a #b" } },
    ];
    assert.deepEqual(extractCaptionFromContent(content), {
      ok: true,
      caption: "本文",
      hashtags: "#a #b",
    });
  });

  it("tool_use 優先（text もあるが tool_use を採用）", () => {
    const content = [
      { type: "text", text: "ignored" },
      { type: "tool_use", input: { caption: "Tool", hashtags: "#x" } },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.caption, "Tool");
  });

  it("tool_use の caption だけ欠けたら text フォールバック", () => {
    const content = [
      { type: "tool_use", input: { hashtags: "#x" } },
      { type: "text", text: '```json\n{"caption":"From text","hashtags":"#y"}\n```' },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.caption, "From text");
  });

  it("text の ```json ブロック内JSONを抽出", () => {
    const content = [
      { type: "text", text: '前置き\n```json\n{"caption":"C1","hashtags":"#h1"}\n```\n後書き' },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.caption, "C1");
      assert.equal(r.hashtags, "#h1");
    }
  });

  it("text 全体が JSON でも抽出できる", () => {
    const content = [
      { type: "text", text: '{"caption":"plain","hashtags":"#p"}' },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.caption, "plain");
  });

  it("不正な JSON はエラーをthrowせず ok:false を返す", () => {
    const content = [
      { type: "text", text: "これは JSON ではない普通の文章です" },
    ];
    assert.deepEqual(extractCaptionFromContent(content), { ok: false, reason: "parse_failed" });
  });

  it("壊れた JSON でも例外にならない", () => {
    const content = [
      { type: "text", text: '```json\n{"caption":"a","hashtags":\n```' },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, false);
  });

  it("caption フィールドがないJSON は ok:false", () => {
    const content = [
      { type: "text", text: '{"foo":"bar"}' },
    ];
    const r = extractCaptionFromContent(content);
    assert.equal(r.ok, false);
  });

  it("空配列は ok:false", () => {
    assert.deepEqual(extractCaptionFromContent([]), { ok: false, reason: "no_content" });
  });

  it("null/undefined/非配列は ok:false（throwしない）", () => {
    assert.equal(extractCaptionFromContent(null).ok, false);
    assert.equal(extractCaptionFromContent(undefined).ok, false);
    assert.equal(extractCaptionFromContent("not array" as unknown).ok, false);
    assert.equal(extractCaptionFromContent({}).ok, false);
  });

  it("caption / hashtags が string でない場合は ok:false", () => {
    const content = [{ type: "tool_use", input: { caption: 123, hashtags: ["a"] } }];
    assert.equal(extractCaptionFromContent(content).ok, false);
  });

  it("caption 空文字は ok:false（品質ガード）", () => {
    const content = [{ type: "tool_use", input: { caption: "", hashtags: "#a" } }];
    assert.equal(extractCaptionFromContent(content).ok, false);
  });
});
