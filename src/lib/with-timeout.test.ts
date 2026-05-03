import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { withTimeout, TimeoutError } from "./with-timeout.ts";

describe("withTimeout", () => {
  it("制限内に解決した値はそのまま返す", async () => {
    const r = await withTimeout(Promise.resolve(42), 1000);
    assert.equal(r, 42);
  });

  it("制限を超えたら TimeoutError をthrow", async () => {
    const slow = new Promise<number>((res) => setTimeout(() => res(1), 200));
    await assert.rejects(withTimeout(slow, 50), (err) => err instanceof TimeoutError);
  });

  it("元の Promise が reject したらそのエラーを伝える", async () => {
    const failing = Promise.reject(new Error("network"));
    await assert.rejects(withTimeout(failing, 1000), /network/);
  });

  it("解決後に setTimeout コールバックが走ってもメモリリークしない", async () => {
    const r = await withTimeout(Promise.resolve("ok"), 10000);
    assert.equal(r, "ok");
  });

  it("TimeoutError は Error のサブクラス", () => {
    const e = new TimeoutError(100);
    assert.ok(e instanceof Error);
    assert.equal(e.name, "TimeoutError");
    assert.match(e.message, /100ms/);
  });
});
