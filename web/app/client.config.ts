import { resolve } from 'path';
import type { ClientConfig } from '../vite.client';

const root = __dirname;

const config: ClientConfig = {
  name: 'app',
  aliases: {
    '@app/design': resolve(root, 'client/design'),
    '@app/router': resolve(root, 'client/router'),
    '@app/shared': resolve(root, 'client/shared'),
    '@app/agents': resolve(root, 'client/agents'),
  },
};

export default config;
