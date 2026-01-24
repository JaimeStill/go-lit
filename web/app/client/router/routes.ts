import type { RouteConfig } from './types';

export const routes: Record<string, RouteConfig> = {
  '': { component: 'gl-home-view', title: 'Home' },
  'config': { component: 'gl-config-list-view', title: 'Configurations' },
  'config/new': { component: 'gl-config-edit-view', title: 'New Configuration' },
  'config/:configId': { component: 'gl-config-edit-view', title: 'Edit Configuration' },
  'execute': { component: 'gl-execute-view', title: 'Execute' },
  'execute/:configId': { component: 'gl-execute-view', title: 'Execute' },
  '*': { component: 'gl-not-found-view', title: 'Not Found' },
};
