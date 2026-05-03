import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { bytesToBase64, validateImageSize, MAX_IMAGE_BYTES } from "./image-encode.ts";

describe("bytesToBase64", () => {
  it("空バイト列は空文字を返す", () => {
    assert.equal(bytesToBase64(new Uint8Array()), "");
  });

  it("'hello' を正しくbase64化", () => {
    const bytes = new TextEncoder().encode("hello");
    assert.equal(bytesToBase64(bytes), "aGVsbG8=");
  });

  it("バイナリ範囲 (0x00-0xFF) を正しくbase64化", () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) bytes[i] = i;
    const b64 = bytesToBase64(bytes);
    const decoded = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    assert.equal(decoded.length, 256);
    for (let i = 0; i < 256; i++) assert.equal(decoded[i], i);
  });

  it("大きなバッファ (200KB) でもクラッシュしない（ループ実装）", () => {
    const bytes = new Uint8Array(200 * 1024);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const start = performance.now();
    const b64 = bytesToBase64(bytes);
    const elapsed = performance.now() - start;
    assert.ok(b64.length > 0);
    assert.ok(elapsed < 1000, `200KB encode は1秒以内: ${elapsed}ms`);
  });

  it("チャンク境界 (0x8000) を跨いでも壊れない", () => {
    const bytes = new Uint8Array(0x8000 + 100);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const b64 = bytesToBase64(bytes);
    const decoded = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    assert.equal(decoded.length, bytes.length);
    for (let i = 0; i < bytes.length; i++) assert.equal(decoded[i], bytes[i]);
  });
});

describe("validateImageSize", () => {
  it("MAX_IMAGE_BYTES は 5MB", () => {
    assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024);
  });

  it("0 byte は invalid", () => {
    assert.deepEqual(validateImageSize(0), { ok: false, reason: "empty" });
  });

  it("負の値は invalid", () => {
    assert.deepEqual(validateImageSize(-1), { ok: false, reason: "empty" });
  });

  it("5MB ちょうどは ok", () => {
    assert.deepEqual(validateImageSize(MAX_IMAGE_BYTES), { ok: true });
  });

  it("5MB + 1 byte は too_large", () => {
    assert.deepEqual(validateImageSize(MAX_IMAGE_BYTES + 1), { ok: false, reason: "too_large" });
  });

  it("100KB は ok", () => {
    assert.deepEqual(validateImageSize(100 * 1024), { ok: true });
  });
});
