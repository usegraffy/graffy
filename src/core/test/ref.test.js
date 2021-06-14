import Graffy from '../Graffy.js';
import fill from '@graffy/fill';

describe('ref', () => {
  describe('author', () => {
    let postProvider;
    let userProvider;

    let store;

    beforeEach(() => {
      store = new Graffy();
      store.use(fill());
      userProvider = jest.fn((query) => {
        const res = Object.keys(query).reduce((res, id) => {
          res[id] = { name: `User ${id}` };
          return res;
        }, {});
        return res;
      });

      postProvider = jest.fn((query) => {
        const res = Object.keys(query).reduce((res, id) => {
          res[id] = {
            title: `Title ${id}`,
            author: { $ref: ['users', `u${id}`] },
          };
          return res;
        }, {});
        return res;
      });

      store.onRead('users', userProvider);
      store.onRead('posts', postProvider);
    });

    test('single', async () => {
      const res = await store.read({
        posts: { abc: { title: true, author: { name: true } } },
      });

      const expected = {
        users: { uabc: { name: 'User uabc' } },
        posts: {
          abc: { title: 'Title abc', author: { $ref: ['users', 'uabc'] } },
        },
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual({
        abc: { title: true, author: { name: true } },
      });
      expect(userProvider).toBeCalledTimes(1);
      expect(userProvider.mock.calls[0][0]).toEqual({ uabc: { name: true } });
      expect(res).toEqual(expected);
    });

    test.skip('range', async () => {
      const res = await store.read({
        users: {
          abc: { id: true, posts: [{ $key: { $first: 2 }, title: true }] },
        },
      });

      const posts = { $ref: ['posts', 'post-abc'], $put: true };
      const expected = {
        users: { abc: { id: 'abc', posts } },
        posts: { 'post-abc': posts },
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual({
        'post-abc': {
          $key: { $first: 2 },
          title: true,
        },
      });
      expect(res).toEqual(expected);
    });
  });

  describe('posts', () => {
    let postProvider;
    let userProvider;

    let store;

    beforeEach(() => {
      store = new Graffy();
      store.use(fill());
      userProvider = jest.fn((query) => {
        const res = Object.keys(query).reduce((res, id) => {
          const posts = query[id].posts.map(({ $key }) => ({
            $key,
            $ref: ['posts', { ...$key, userId: id }],
          }));
          res[id] = { name: `User ${id}`, posts };
          return res;
        }, {});
        // console.log('userProvider', { query, res });
        return res;
      });

      postProvider = jest.fn((query) => {
        const $chi = [];
        for (let i = 0; i < 3; i++) {
          $chi.push({ $key: { postId: i }, title: `Title ${i}` });
        }
        const res = query.map(({ $key }) => ({ $key, $chi }));
        console.log('postProvider', res);
        return res;
      });

      store.onRead('users', userProvider);
      store.onRead('posts', postProvider);
    });

    test('range', async () => {
      const res = await store.read({
        users: {
          abc: {
            id: true,
            posts: [{ $key: { tag: 'x', $first: 2 }, title: true }],
          },
        },
      });

      const posts = [];
      posts.$ref = ['posts'];
      const expected = {
        users: { abc: { id: 'abc', posts } },
        posts,
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual([
        { $key: { $first: 2, tag: 'x', userId: 'abc' }, title: true },
      ]);
      console.log('Result', res);
      expect(res).toEqual(expected);
    });

    test.skip('point', async () => {
      // ref = (id) => ({ authorId: id, $all: true });
      const res = await store.read({
        users: {
          abc: { id: true, posts: { title: true } },
        },
      });

      const posts = { $ref: ['posts'], title: null };
      const expected = {
        users: { abc: { id: 'abc', posts } },
        posts,
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual({
        $key: { $all: true, authorId: 'abc' },
        title: true,
      });
      expect(res).toEqual(expected);
    });
  });
});
