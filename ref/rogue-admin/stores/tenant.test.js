import { createTenantStore } from './tenant.js';

jest.mock('@graffy/rogue-db');

test('store must respond to protos', () => {
  createTenantStore({
    user: {
      type: 'db',
      collection: 'user',
      indexes: [['email'], ['role']],
      links: [{ prop: ['posts'], target: ['post'], back: ['author'] }],
    },
    post: {
      type: 'db',
      collection: 'post',
      indexes: [['slug'], ['publishedAt']],
      links: [{ prop: ['author'], target: ['user'] }],
    },
  });
});
