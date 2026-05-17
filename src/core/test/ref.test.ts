import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';
import { splitArgs } from '@graffy/common';
import fill from '@graffy/fill';
import { page, ref } from '@graffy/testing';
import Graffy from '../Graffy.ts';

describe('ref', () => {
  describe('author', () => {
    let postProvider;
    let userProvider;

    let store;

    beforeEach(() => {
      store = new Graffy();
      store.use(fill());
      userProvider = mock.fn((query) => {
        const res = Object.keys(query).reduce((res, id) => {
          res[id] = { name: `User ${id}` };
          return res;
        }, {});
        return res;
      });

      postProvider = mock.fn((query) => {
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
            author: ref(['users', 'uabc'], { name: 'User uabc' }),
          },
        },
      };

      assert.strictEqual(postProvider.mock.callCount(), 1);
      assert.deepStrictEqual(postProvider.mock.calls[0].arguments[0], {
        abc: { title: true, author: { name: true } },
      });
      assert.strictEqual(userProvider.mock.callCount(), 1);
      assert.deepStrictEqual(userProvider.mock.calls[0].arguments[0], {
        uabc: { name: true },
      });
      assert.deepStrictEqual(res, expected);
    });
  });

  describe('posts', () => {
    let postProvider;
    let userProvider;

    let store;

    beforeEach(() => {
      store = new Graffy();
      store.use(fill());
      userProvider = mock.fn((query) => {
        const res = Object.keys(query).reduce((res, id) => {
          const posts = query[id].posts.map(({ $key }) => ({
            $key,
            $ref: ['posts', { ...$key, userId: id }],
          }));
          res[id] = { id, name: `User ${id}`, posts };
          return res;
        }, {});
        return res;
      });

      postProvider = mock.fn((/** @type {array} */ query) => {
        const res = [];
        for (const { $key } of query) {
          const [_, filter] = splitArgs($key);
          for (let i = 0; i < 3; i++) {
            res.push({
              $key: { ...filter, $cursor: { postId: i } },
              title: `Title ${i}`,
            });
          }
        }
        return res;
      });

      store.onRead('users', userProvider);
      store.onRead('posts', postProvider);
    });

    test('range1', async () => {
      const res = await store.read({
        users: {
          abc: {
            name: true,
            posts: [{ $key: { tag: 'x', $first: 2 }, title: true }],
          },
        },
      });

      const posts = page({ tag: 'x', $until: { postId: 1 } }, 2, [
        { $key: { tag: 'x', $cursor: { postId: 0 } }, title: 'Title 0' },
        { $key: { tag: 'x', $cursor: { postId: 1 } }, title: 'Title 1' },
      ]);
      const expected = { users: { abc: { name: 'User abc', posts } } };

      assert.strictEqual(postProvider.mock.callCount(), 1);
      assert.deepStrictEqual(postProvider.mock.calls[0].arguments[0], [
        { $key: { $first: 2, tag: 'x', userId: 'abc' }, title: true },
      ]);
      assert.deepStrictEqual(res, expected);
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

      const posts = page({ $all: true, $until: { postId: 1 } }, 2, [
        { $key: { postId: 0 }, title: 'Title 0' },
        { $key: { postId: 1 }, title: 'Title 1' },
      ]);
      const expected = { users: { abc: { name: 'User abc', posts } } };

      assert.strictEqual(postProvider.mock.callCount(), 1);
      assert.deepStrictEqual(postProvider.mock.calls[0].arguments[0], [
        { $key: { $first: 2, userId: 'abc' }, title: true },
      ]);
      assert.deepStrictEqual(res, expected);
    });
  });
});
