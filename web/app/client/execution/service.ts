import { createContext } from '@lit/context';
import { signal, Signal } from '@lit-labs/signals';
import { api } from '@app/shared';
import type { AgentConfig } from '@app/config/types';
import type { Message, ChatRequest } from './types';

export const executionServiceContext =
  createContext<ExecutionService>('execution-service');

export interface ExecutionService {
  messages: Signal.State<Message[]>;
  streaming: Signal.State<boolean>;
  error: Signal.State<string | null>;
  currentResponse: Signal.State<string>;

  chat(config: AgentConfig, prompt: string): void;
  vision(config: AgentConfig, prompt: string, images: File[]): void;
  cancel(): void;
  clear(): void;
}

export function createExecutionService(): ExecutionService {
  const messages = signal<Message[]>([]);
  const streaming = signal<boolean>(false);
  const error = signal<string | null>(null);
  const currentResponse = signal<string>('');

  let abortController: AbortController | null = null;

  function addUserMessage(content: string): void {
    messages.set([
      ...messages.get(),
      { role: 'user', content, timestamp: Date.now() },
    ]);
  }

  function finalizeResponse(): void {
    const response = currentResponse.get();
    if (response) {
      messages.set([
        ...messages.get(),
        { role: 'assistant', content: response, timestamp: Date.now() },
      ]);
      currentResponse.set('');
    }
  }

  function handleChunk(chunk: { choices: Array<{ delta?: { content?: string } }> }): void {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      currentResponse.set(currentResponse.get() + content);
    }
  }

  function handleError(err: string): void {
    error.set(err);
    streaming.set(false);
    finalizeResponse();
  }

  function handleComplete(): void {
    streaming.set(false);
    finalizeResponse();
  }

  return {
    messages,
    streaming,
    error,
    currentResponse,
    chat(config: AgentConfig, prompt: string): void {
      if (streaming.get()) return;

      error.set(null);
      streaming.set(true);
      addUserMessage(prompt);

      const { id: _, ...apiConfig } = config;
      const request: ChatRequest = { config: apiConfig, prompt };

      abortController = api.chat(request, {
        onChunk: handleChunk,
        onError: handleError,
        onComplete: handleComplete,
      });
    },
    vision(config: AgentConfig, prompt: string, images: File[]): void {
      if (streaming.get()) return;

      error.set(null);
      streaming.set(true);
      addUserMessage(`[Vision] ${prompt}`);

      const { id: _, ...apiConfig } = config;

      abortController = api.vision(apiConfig, prompt, images, {
        onChunk: handleChunk,
        onError: handleError,
        onComplete: handleComplete
      });
    },
    cancel(): void {
      abortController?.abort();
      abortController = null;
      streaming.set(false);
      finalizeResponse();
    },
    clear(): void {
      this.cancel();
      messages.set([]);
      error.set(null);
    },
  };
}
