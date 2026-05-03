import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { retryWithBackoff, fetchWithTimeout } from "./retry.ts";

describe("retryWithBackoff", () => {
  it("1回目で成功すればリトライしない", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => { calls++; return "ok"; },
      { attempts: 3, baseDelayMs: 1 },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  it("途中で失敗→成功でリトライする", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls++;
        if (calls < 2) throw new Error("transient");
        return "ok";
      },
      { attempts: 3, baseDelayMs: 1 },
    );
    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  it("全試行失敗で最後のエラーをthrow", async () => {
    let calls = 0;
    await assert.rejects(
      retryWithBackoff(
        async () => { calls++; throw new Error(`err${calls}`); },
        { attempts: 3, baseDelayMs: 1 },
      ),
      /err3/,
    );
    assert.equal(calls, 3);
  });

  it("attempts=1 なら1回だけ", async () => {
    let calls = 0;
    await assert.rejects(
      retryWithBackoff(
        async () => { calls++; throw new Error("nope"); },
        { attempts: 1, baseDelayMs: 1 },
      ),
    );
    assert.equal(calls, 1);
  });

  it("バックオフ時間は指数的に増える（baseDelayMs * 2^i）", async () => {
    const delays: number[] = [];
    let last = performance.now();
    let calls = 0;
    await assert.rejects(
      retryWithBackoff(
        async () => {
          const now = performance.now();
          if (calls > 0) delays.push(now - last);
          last = now;
          calls++;
          throw new Error("fail");
        },
        { attempts: 3, baseDelayMs: 20 },
      ),
    );
    // 試行2の前: 20ms, 試行3の前: 40ms
    assert.ok(delays[0] >= 18, `1st backoff >= 18ms, got ${delays[0]}`);
    assert.ok(delays[1] >= 38, `2nd backoff >= 38ms, got ${delays[1]}`);
  });
});

describe("fetchWithTimeout", () => {
  it("タイムアウト前に応答すれば成功", async () => {
    const res = await fetchWithTimeout(
      "data:application/json,%7B%22ok%22%3Atrue%7D",
      {},
      5000,
    );
    const body = await res.json();
    assert.deepEqual(body, { ok: true });
  });

  it("既に abort 済みの signal を渡すと即座に失敗", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(
      fetchWithTimeout(
        "data:application/json,%7B%22ok%22%3Atrue%7D",
        { signal: ctrl.signal },
        5000,
      ),
    );
  });
});
