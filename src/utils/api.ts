export interface SafeFetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function safeFetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(url, init);
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
      };
    }

    return {
      ok: true,
      status: res.status,
      data: parsed as T,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network request failed.',
    };
  }
}
