import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { jstMidnightIso } from "./jst-day.ts";

describe("jstMidnightIso", () => {
  it("UTC 2026-05-03T15:00:00Z (JST 5/4 00:00) は 2026-05-03T15:00:00.000Z を返す", () => {
    const utc = new Date("2026-05-03T15:00:00.000Z");
    assert.equal(jstMidnightIso(utc), "2026-05-03T15:00:00.000Z");
  });

  it("UTC 2026-05-03T14:59:59Z (JST 5/3 23:59:59) は 2026-05-02T15:00:00.000Z を返す", () => {
    const utc = new Date("2026-05-03T14:59:59.000Z");
    assert.equal(jstMidnightIso(utc), "2026-05-02T15:00:00.000Z");
  });

  it("UTC 2026-05-03T00:00:00Z (JST 5/3 09:00) は 2026-05-02T15:00:00.000Z を返す", () => {
    const utc = new Date("2026-05-03T00:00:00.000Z");
    assert.equal(jstMidnightIso(utc), "2026-05-02T15:00:00.000Z");
  });

  it("UTC 2026-05-03T15:00:00.001Z (JST 5/4 00:00:00.001) は 2026-05-03T15:00:00.000Z を返す", () => {
    const utc = new Date("2026-05-03T15:00:00.001Z");
    assert.equal(jstMidnightIso(utc), "2026-05-03T15:00:00.000Z");
  });

  it("年跨ぎ JST 1/1 00:00 = UTC 12/31 15:00", () => {
    const utc = new Date("2025-12-31T15:00:00.000Z");
    assert.equal(jstMidnightIso(utc), "2025-12-31T15:00:00.000Z");
  });

  it("年跨ぎ前 JST 12/31 23:59 = UTC 12/31 14:59 → 12/30 15:00 を返す", () => {
    const utc = new Date("2025-12-31T14:59:00.000Z");
    assert.equal(jstMidnightIso(utc), "2025-12-30T15:00:00.000Z");
  });
});
