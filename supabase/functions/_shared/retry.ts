export type RetryOptions = {
  attempts: number;
  baseDelayMs: number;
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < opts.attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < opts.attempts - 1) {
        const delay = opts.baseDelayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const externalSignal = init.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      ctrl.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener("abort", () => ctrl.abort(externalSignal.reason), { once: true });
    }
  }
  const timer = setTimeout(() => ctrl.abort(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
