import type { Result, StreamingChunk, StreamOptions } from './types';

const BASE = '/api';
const SSE_DATA_PREFIX = 'data: ';
const SSE_DONE_SIGNAL = '[DONE]';

function handleStreamResponse(options: StreamOptions) {
  return async (res: Response) => {
    if (!res.ok) {
      const text = await res.text();
      options.onError?.(text || res.statusText);
      return;
    }
    await parseSSE(res, options);
  };
}

function handleStreamError(options: StreamOptions) {
  return (err: Error) => {
    if (err.name !== 'AbortError') {
      options.onError?.(err.message);
    }
  };
}

async function parseSSE(
  response: Response,
  options: StreamOptions
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith(SSE_DATA_PREFIX)) continue;
      const data = line.slice(SSE_DATA_PREFIX.length).trim();

      if (data === SSE_DONE_SIGNAL) {
        options.onComplete?.();
        return;
      }

      try {
        const chunk = JSON.parse(data) as StreamingChunk;
        if ('error' in chunk) {
          options.onError?.((chunk as unknown as { error: string }).error);
          return;
        }
        options.onChunk(chunk);
      } catch {
        // Skip malformed chunks
      }
    }
  }

  options.onComplete?.();
}

export const api = {
  async post<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          return { ok: false, error: json.error || res.statusText };
        } catch {
          return { ok: false, error: text || res.statusText };
        }
      }
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
  chat(body: unknown, options: StreamOptions): AbortController {
    const controller = new AbortController();
    const signal = options.signal ?? controller.signal;

    fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
      .then(handleStreamResponse(options))
      .catch(handleStreamError(options));

    return controller;
  },
  vision(
    config: unknown,
    prompt: string,
    images: File[],
    options: StreamOptions
  ): AbortController {
    const controller = new AbortController();
    const signal = options.signal ?? controller.signal;

    const formData = new FormData();
    formData.append('config', JSON.stringify(config));
    formData.append('prompt', prompt);
    images.forEach((img) => formData.append('images[]', img));

    fetch(`${BASE}/vision`, {
      method: 'POST',
      body: formData,
      signal,
    })
      .then(handleStreamResponse(options))
      .catch(handleStreamError(options));

    return controller;
  }
}
