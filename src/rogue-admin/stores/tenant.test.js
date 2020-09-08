import { createTenantStore } from './tenant.js';

test('store must respond to protos', () => {
  const store = createTenantStore({
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
