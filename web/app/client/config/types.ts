export type Duration = string;

export interface RetryConfig {
  max_retries?: number;
  initial_backoff?: Duration;
  max_backoff?: Duration;
  backoff_multiplier?: number;
  jitter?: boolean;
}

export interface ClientConfig {
  timeout?: Duration;
  retry?: RetryConfig;
  connection_pool_size?: number;
  connection_timeout?: Duration;
}

export interface ProviderConfig {
  name?: string;
  base_url?: string;
  options?: Record<string, unknown>;
}

export interface ModelConfig {
  name?: string;
  capabilities?: Record<string, Record<string, unknown>>;
}

export interface AgentConfig {
  id: string;
  name: string;
  system_prompt?: string;
  client?: ClientConfig;
  provider?: ProviderConfig;
  model?: ModelConfig;
}

export function createDefaultConfig(): AgentConfig {
  return {
    id: crypto.randomUUID(),
    name: 'New Agent',
    system_prompt: '',
    provider: {
      name: '',
      base_url: '',
    },
    model: {
      name: '',
      capabilities: {
        chat: {},
      },
    },
  };
}
