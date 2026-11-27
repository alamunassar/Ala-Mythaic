export const DEFAULT_FETCH_TIMEOUT_MS = 45_000;

export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  timedOut?: boolean;
}

export interface SafeFetchInit extends RequestInit {
  timeoutMs?: number;
}

export async function safeFetchJson<T>(
  url: string,
  init?: SafeFetchInit,
): Promise<SafeFetchResult<T>> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, signal: externalSignal, ...fetchInit } = init ?? {};
  const controller = new AbortController();
  let didTimeout = false;

  const onExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, timeoutMs)
      : null;

  try {
    const res = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    });
    const rawText = await res.text();
    const contentType = res.headers.get('content-type') ?? '';

    let parsed: unknown = null;
    if (rawText.trim().length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const looksLikeHtml =
          contentType.includes('text/html') ||
          rawText.trimStart().toLowerCase().startsWith('<!doctype') ||
          rawText.trimStart().toLowerCase().startsWith('<html');

        return {
          ok: false,
          status: res.status,
          data: null,
          error: looksLikeHtml
            ? `Backend API returned an HTML page instead of JSON (HTTP ${res.status}). Ensure the full-stack server is running or use manual entry.`
            : `Backend API returned invalid JSON (HTTP ${res.status}).`,
        };
      }
    }

    if (!res.ok) {
      const errMsg =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `Request failed with HTTP ${res.status}.`;
      return {
        ok: false,
        status: res.status,
        data: parsed as T | null,
        error: errMsg,
        timedOut: res.status === 408,
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed as T,
      error: null,
    };
  } catch (err) {
    if (didTimeout) {
      return {
        ok: false,
        status: 408,
        data: null,
        error: 'Request timed out while waiting for the server. Please retry or use manual entry.',
        timedOut: true,
      };
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        data: null,
        error: 'Request was cancelled.',
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network request failed.',
    };
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
