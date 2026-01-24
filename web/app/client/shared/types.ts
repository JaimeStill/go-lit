export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface StreamingChunk {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export type StreamCallback = (chunk: StreamingChunk) => void;
export type StreamErrorCallback = (error: string) => void;
export type StreamCompleteCallback = () => void;

export interface StreamOptions {
  onChunk: StreamCallback;
  onError?: StreamErrorCallback;
  onComplete?: StreamCompleteCallback;
  signal?: AbortSignal;
}
