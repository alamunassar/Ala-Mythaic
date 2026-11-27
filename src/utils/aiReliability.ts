export const DEFAULT_GEMINI_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
export const DEFAULT_ATTEMPT_TIMEOUT_MS = 25_000;
export const DEFAULT_OVERALL_TIMEOUT_MS = 40_000;
export const DEFAULT_MAX_TRANSIENT_RETRIES = 1;
export const DEFAULT_RETRY_DELAY_MS = 600;

export class AiTimeoutError extends Error {
  readonly code = 'AI_TIMEOUT';
  readonly status = 408;

  constructor(message = 'Gemini AI request timed out. Please retry or use manual entry.') {
    super(message);
    this.name = 'AiTimeoutError';
  }
}

export function isAiTimeoutError(error: unknown): boolean {
  if (error instanceof AiTimeoutError) return true;
  if (error && typeof error === 'object') {
    const record = error as { name?: unknown; code?: unknown; message?: unknown };
    if (record.code === 'AI_TIMEOUT' || record.name === 'AiTimeoutError') return true;
    if (record.name === 'AbortError' || record.name === 'TimeoutError') return true;
    if (typeof record.message === 'string' && record.message.toLowerCase().includes('timed out')) {
      return true;
    }
  }
  return false;
}

export function parseJsonSafely<T>(
  raw: string | undefined,
): { ok: true; data: T } | { ok: false; preview: string } {
  if (!raw || !raw.trim()) {
    return { ok: false, preview: '(empty response)' };
  }
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return { ok: true, data: JSON.parse(cleaned) as T };
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return {
          ok: true,
          data: JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T,
        };
      } catch {
        // fall through
      }
    }
    return { ok: false, preview: cleaned.slice(0, 300) };
  }
}

export function extractReadableError(error: unknown): string {
  if (isAiTimeoutError(error)) {
    return error instanceof Error && error.message
      ? error.message
      : 'Gemini AI request timed out. Please retry or continue with manual entry.';
  }
  const raw = error instanceof Error ? error.message : String(error);
  let msg = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) msg = String(parsed.error.message);
  } catch {
    // not raw JSON
  }
  if (msg.includes('free_tier_requests') || msg.includes('Quota exceeded')) {
    return 'Daily free-tier Gemini API quota reached for the primary model. You can continue using manual entry, or select a billing-enabled API key in Settings > Secrets.';
  }
  if (msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
    return 'Gemini API is currently experiencing high demand (temporary 503). Please retry in a moment or enter specifications manually.';
  }
  return msg || 'AI extraction request failed.';
}

export function getApiErrorStatus(error: unknown): number {
  if (isAiTimeoutError(error)) {
    return 408;
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes('free_tier_requests') ||
    msg.includes('Quota exceeded') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  ) {
    return 429;
  }
  return 500;
}

export function getApiErrorCode(error: unknown): string {
  return isAiTimeoutError(error) ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED';
}

export interface MinimalGenAiClient {
  models: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generateContent: (params: any) => Promise<{ text?: string }>;
  };
}

export interface GenerateWithFallbackOptions {
  models?: readonly string[];
  attemptTimeoutMs?: number;
  overallTimeoutMs?: number;
  maxTransientRetries?: number;
  retryDelayMs?: number;
}

function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new AiTimeoutError(timeoutMessage));
    }, Math.max(1, timeoutMs));

    operation(controller.signal)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        if (controller.signal.aborted && !isAiTimeoutError(err)) {
          reject(new AiTimeoutError(timeoutMessage));
          return;
        }
        reject(err);
      });
  });
}

export async function generateContentWithFallback(
  ai: MinimalGenAiClient,
  params: Record<string, unknown>,
  options: GenerateWithFallbackOptions = {},
): Promise<{ text?: string }> {
  const models = options.models ?? DEFAULT_GEMINI_MODELS;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const overallTimeoutMs = options.overallTimeoutMs ?? DEFAULT_OVERALL_TIMEOUT_MS;
  const maxTransientRetries = options.maxTransientRetries ?? DEFAULT_MAX_TRANSIENT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const deadline = Date.now() + Math.max(1, overallTimeoutMs);
  let lastError: unknown;

  for (const model of models) {
    const totalAttempts = 1 + Math.max(0, maxTransientRetries);
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new AiTimeoutError(
          'Gemini AI request timed out before completion. Please retry or enter specifications manually.',
        );
      }

      const thisTimeoutMs = Math.min(attemptTimeoutMs, remainingMs);
      try {
        const existingConfig =
          params.config && typeof params.config === 'object'
            ? (params.config as Record<string, unknown>)
            : undefined;

        const result = await runWithTimeout(
          (signal) =>
            ai.models.generateContent({
              ...params,
              model,
              config: {
                ...(existingConfig ?? {}),
                abortSignal: signal,
              },
            }),
          thisTimeoutMs,
          `Gemini AI request timed out after ${Math.round(thisTimeoutMs / 1000)}s. Please retry or enter specifications manually.`,
        );
        console.info(`[MITHAQ-Lab Gemini] Succeeded with model=${model} (attempt ${attempt + 1})`);
        return result;
      } catch (err) {
        lastError = err;
        if (isAiTimeoutError(err)) {
          console.error(`[MITHAQ-Lab Gemini] ${model} attempt ${attempt + 1} timed out`);
          throw err;
        }

        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[MITHAQ-Lab Gemini] ${model} attempt ${attempt + 1} failed:`,
          msg.slice(0, 220),
        );

        const isDailyQuota =
          msg.includes('free_tier_requests') ||
          msg.includes('PerDay') ||
          msg.includes('Quota exceeded');
        if (isDailyQuota) {
          break; // Immediately move to fallback model
        }

        const isTransient =
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('429') ||
          msg.includes('RESOURCE_EXHAUSTED');
        if (!isTransient) {
          throw err;
        }

        if (attempt + 1 < totalAttempts) {
          const remainingBeforeWait = deadline - Date.now();
          if (remainingBeforeWait <= retryDelayMs + 50) {
            throw new AiTimeoutError(
              'Gemini AI request timed out during retry backoff. Please retry or use manual entry.',
            );
          }
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
        }
      }
    }
  }

  throw lastError;
}
