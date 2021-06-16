import Graffy from '../Graffy.js';
import fill from '@graffy/fill';
// import {isEmpty} from '@graffy/common';

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
        posts: {
          abc: {
            title: 'Title abc',
            author: { $ref: ['users', 'uabc'], name: 'User uabc' },
          },
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
          res[id] = { id, name: `User ${id}`, posts };
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
        // console.log('postProvider', res);
        return res;
      });

      store.onRead('users', userProvider);
      store.onRead('posts', postProvider);
    });

    test('range', async () => {
      const res = await store.read({
        users: {
          abc: {
            name: true,
            posts: [{ $key: { tag: 'x', $first: 2 }, title: true }],
          },
        },
      });

      const expected = {
        users: {
          abc: {
            name: 'User abc',
            posts: [
              {
                $key: { tag: 'x', $all: true },
                $ref: ['posts', { tag: 'x', userId: 'abc', $all: true }],
              },
            ],
          },
        },
        posts: [
          {
            $key: { tag: 'x', userId: 'abc', $cursor: { postId: 0 } },
            title: 'Title 0',
          },
          {
            $key: { tag: 'x', userId: 'abc', $cursor: { postId: 1 } },
            title: 'Title 1',
          },
        ],
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual([
        { $key: { $first: 2, tag: 'x', userId: 'abc' }, title: true },
      ]);
      expect(res).toEqual(expected);
    });

    test('range2', async () => {
      const res = await store.read({
        users: {
          abc: {
            name: true,
            posts: [{ $key: { $first: 2 }, title: true }],
          },
        },
      });

      const expected = {
        users: {
          abc: {
            name: 'User abc',
            posts: [
              {
                $key: { $all: true },
                $ref: ['posts', { userId: 'abc', $all: true }],
              },
            ],
          },
        },
        posts: [
          {
            $key: { userId: 'abc', $cursor: { postId: 0 } },
            title: 'Title 0',
          },
          {
            $key: { userId: 'abc', $cursor: { postId: 1 } },
            title: 'Title 1',
          },
        ],
      };

      expect(postProvider).toBeCalledTimes(1);
      expect(postProvider.mock.calls[0][0]).toEqual([
        { $key: { $first: 2, userId: 'abc' }, title: true },
      ]);
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
