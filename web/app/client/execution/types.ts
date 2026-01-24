import type { AgentConfig } from '@app/config/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  config: Omit<AgentConfig, 'id'>;
  prompt: string;
}
