import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { formatAccountInfo, type AccountInfo } from "./account-info.ts";

const FULL: AccountInfo = {
  account_name: "マルヤス",
  target_audience: "理系大学生",
  purpose: "採用",
  genre: "製造業",
  follower_scale: "1,000〜5,000人",
  competitors: "@toyota_jp",
};

const EMPTY: AccountInfo = {
  account_name: "",
  target_audience: "",
  purpose: "",
  genre: "",
  follower_scale: "",
  competitors: "",
};

describe("formatAccountInfo", () => {
  it("全項目あれば全行整形", () => {
    const r = formatAccountInfo(FULL);
    assert.match(r, /【アカウント情報】/);
    assert.match(r, /アカウント名: マルヤス/);
    assert.match(r, /ターゲット層: 理系大学生/);
    assert.match(r, /投稿の目的: 採用/);
    assert.match(r, /ジャンル: 製造業/);
    assert.match(r, /フォロワー規模: 1,000〜5,000人/);
    assert.match(r, /競合・参考アカウント: @toyota_jp/);
  });

  it("全項目空なら空文字", () => {
    assert.equal(formatAccountInfo(EMPTY), "");
  });

  it("一部のみでもヘッダ込みで返す", () => {
    const r = formatAccountInfo({ ...EMPTY, account_name: "A", genre: "G" });
    assert.match(r, /【アカウント情報】/);
    assert.match(r, /アカウント名: A/);
    assert.match(r, /ジャンル: G/);
    assert.doesNotMatch(r, /ターゲット層/);
    assert.doesNotMatch(r, /競合/);
  });

  it("空白のみのフィールドはスキップ", () => {
    const r = formatAccountInfo({ ...EMPTY, account_name: "   ", genre: "G" });
    assert.doesNotMatch(r, /アカウント名/);
    assert.match(r, /ジャンル: G/);
  });

  it("全フィールド空白のみなら空文字", () => {
    const r = formatAccountInfo({
      account_name: " ", target_audience: " ", purpose: " ",
      genre: " ", follower_scale: " ", competitors: " ",
    });
    assert.equal(r, "");
  });

  it("undefined/null フィールドでも壊れない", () => {
    const r = formatAccountInfo({
      account_name: "OK",
      target_audience: undefined as unknown as string,
      purpose: null as unknown as string,
      genre: "",
      follower_scale: "",
      competitors: "",
    });
    assert.match(r, /アカウント名: OK/);
    assert.doesNotMatch(r, /ターゲット層/);
    assert.doesNotMatch(r, /投稿の目的/);
  });
});
