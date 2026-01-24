import { createContext } from '@lit/context';
import { signal, Signal } from '@lit-labs/signals';
import type { AgentConfig } from './types';

export const configServiceContext = createContext<ConfigService>('config-service');

const STORAGE_KEY = 'gl-agent-configs';

export interface ConfigService {
  configs: Signal.State<AgentConfig[]>;
  loading: Signal.State<boolean>;

  list(): void;
  find(id: string): AgentConfig | undefined;
  save(config: AgentConfig): void;
  delete(id: string): void;
}

export function createConfigService(): ConfigService {
  const configs = signal<AgentConfig[]>([]);
  const loading = signal<boolean>(false);

  function persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs.get()));
  }

  return {
    configs,
    loading,
    list(): void {
      loading.set(true);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        configs.set(stored ? JSON.parse(stored) : []);
      } catch (e) {
        console.error('Failed to load configs:', e);
        configs.set([]);
      } finally {
        loading.set(false);
      }
    },
    find(id: string): AgentConfig | undefined {
      return configs.get().find((c) => c.id === id);
    },
    save(config: AgentConfig): void {
      const current = configs.get();
      const index = current.findIndex((c) => c.id === config.id);

      if (index >= 0) {
        const updated = [...current];
        updated[index] = config;
        configs.set(updated);
      } else {
        configs.set([...current, config]);
      }

      persist();
    },
    delete(id: string): void {
      configs.set(configs.get().filter((c) => c.id !== id));
      persist();
    }
  }
}
