import { defineConfig } from 'vite';
import { merge } from './vite.client';
import appConfig from './app/client.config';
import scalarConfig from './scalar/client.config';

export default defineConfig(merge([appConfig, scalarConfig]));
