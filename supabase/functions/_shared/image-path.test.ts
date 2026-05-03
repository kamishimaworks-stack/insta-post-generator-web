import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { parseImagePath } from "./image-path.ts";

const USER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("parseImagePath", () => {
  it("正しい post-images/<userId>/<file> を受け入れる", () => {
    const r = parseImagePath(`post-images/${USER}/abc.jpg`, USER);
    assert.deepEqual(r, { ok: true, bucket: "post-images", filePath: `${USER}/abc.jpg` });
  });

  it("ネストされたサブパスも受け入れる", () => {
    const r = parseImagePath(`post-images/${USER}/sub/abc.jpg`, USER);
    assert.deepEqual(r, { ok: true, bucket: "post-images", filePath: `${USER}/sub/abc.jpg` });
  });

  it("空文字は invalid", () => {
    const r = parseImagePath("", USER);
    assert.equal(r.ok, false);
  });

  it("undefined は invalid", () => {
    const r = parseImagePath(undefined as unknown as string, USER);
    assert.equal(r.ok, false);
  });

  it("非string は invalid", () => {
    const r = parseImagePath(123 as unknown as string, USER);
    assert.equal(r.ok, false);
  });

  it("bucket が post-images 以外は拒否（権限昇格阻止）", () => {
    const r = parseImagePath(`other-bucket/${USER}/abc.jpg`, USER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "invalid_bucket");
  });

  it("他人のユーザーIDは拒否（IDOR阻止）", () => {
    const r = parseImagePath(`post-images/${OTHER}/abc.jpg`, USER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "user_mismatch");
  });

  it("ファイル名なしは拒否", () => {
    const r = parseImagePath(`post-images/${USER}/`, USER);
    assert.equal(r.ok, false);
  });

  it("ファイル名なし(末尾なし)は拒否", () => {
    const r = parseImagePath(`post-images/${USER}`, USER);
    assert.equal(r.ok, false);
  });

  it("path traversal (..) は拒否", () => {
    const r = parseImagePath(`post-images/${USER}/../secret.jpg`, USER);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "path_traversal");
  });

  it("path traversal (.) は拒否", () => {
    const r = parseImagePath(`post-images/${USER}/./abc.jpg`, USER);
    assert.equal(r.ok, false);
  });

  it("空セグメント (//) は拒否", () => {
    const r = parseImagePath(`post-images/${USER}//abc.jpg`, USER);
    assert.equal(r.ok, false);
  });

  it("先頭スラッシュは拒否", () => {
    const r = parseImagePath(`/post-images/${USER}/abc.jpg`, USER);
    assert.equal(r.ok, false);
  });

  it("バックスラッシュは拒否（Windowsパス偽装）", () => {
    const r = parseImagePath(`post-images\\${USER}\\abc.jpg`, USER);
    assert.equal(r.ok, false);
  });

  it("URL エンコードされた .. を含むものは拒否", () => {
    const r = parseImagePath(`post-images/${USER}/%2e%2e/secret.jpg`, USER);
    assert.equal(r.ok, false);
  });

  it("空白のみの userId は拒否", () => {
    const r = parseImagePath(`post-images/${USER}/abc.jpg`, "   ");
    assert.equal(r.ok, false);
  });
});
