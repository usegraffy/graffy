import { MAX_KEY, MIN_KEY, encodeGraph, encodeQuery } from '@graffy/common';
import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import { mockBackend, page } from '@graffy/testing';
import { keyref, ref } from '@graffy/testing';
import { jest } from '@jest/globals';
import link from './index.js';

describe('link', () => {
  let store;
  let backend;

  beforeEach(() => {
    store = new Graffy();
    store.use(fill());
    backend = mockBackend();
    backend.read = jest.fn(backend.read);
    store.use(
      link({
        'post.$pid.author': ['user', '$$post.$pid.authorId'],
        'user.$uid.posts': ['post', { $all: true, authorId: '$uid' }],
        'user.$uid.friends.$i': ['user', '$$user.$uid.friendIds.$i'],
      }),
    );
    store.use(backend.middleware);

    backend.write([{ key: MIN_KEY, end: MAX_KEY, version: 1 }]); // Set to empty
    backend.write(
      encodeGraph({
        user: {
          ali: { name: 'Alicia' },
          bob: { name: 'Robert' },
          carl: { name: 'Carl', friendIds: ['ali', 'bob'] },
        },
        post: [
          { $key: 'p01', title: 'Post 1 A', authorId: 'ali' },
          { $key: 'p02', title: 'Post 2 B', authorId: 'bob' },
          { $key: 'p03', title: 'Post 3 a', authorId: 'ali' },
          { $key: 'p04', title: 'Post 4 b', authorId: 'bob' },

          // Results to the queries we're going to be making
          {
            $key: { $all: true, authorId: 'ali', tag: 'z' },
            $chi: [
              keyref({ id: 'p01' }, ['post', 'p01']),
              keyref({ id: 'p03' }, ['post', 'p03']),
            ],
          },
          {
            $key: { $all: true, authorId: 'bob' },
            $chi: [
              keyref({ id: 'p02' }, ['post', 'p02']),
              keyref({ id: 'p04' }, ['post', 'p04']),
            ],
          },
          keyref({ top: true }, ['post', 'p01']),
        ],
      }),
    );
  });

  test('read_without_links', async () => {
    const res = await store.read('user', { ali: { name: true } });
    expect(res).toEqual({ ali: { name: 'Alicia' } });
  });

  test('read_forward_link', async () => {
    const res = await store.read('post.p01', {
      title: true,
      author: { name: true },
    });
    expect(res).toEqual({
      title: 'Post 1 A',
      author: ref(['user', 'ali'], { name: 'Alicia' }),
    });
  });

  test('read_multi_backward_link', async () => {
    const res = await store.read('user', {
      ali: { name: true, posts: { $key: { tag: 'z', $last: 1 }, title: true } },
      bob: { name: true, posts: { $key: { $first: 1 }, title: true } },
    });

    const exp = {
      ali: {
        name: 'Alicia',
        posts: [
          keyref({ $cursor: { id: 'p03' }, tag: 'z' }, ['post', 'p03'], {
            title: 'Post 3 a',
          }),
        ],
      },
      bob: {
        name: 'Robert',
        posts: [keyref({ id: 'p02' }, ['post', 'p02'], { title: 'Post 2 B' })],
      },
    };

    Object.assign(exp.ali.posts, {
      $page: { $all: true, $since: { id: 'p03' }, tag: 'z' },
      $next: null,
      $prev: { $last: 1, $before: { id: 'p03' }, tag: 'z' },
    });

    Object.assign(exp.bob.posts, {
      $page: { $all: true, $until: { id: 'p02' } },
      $next: { $first: 1, $after: { id: 'p02' } },
      $prev: null,
    });

    expect(res).toEqual(exp);
    expect(res.ali.posts[0].$ref).toEqual(exp.ali.posts[0].$ref);
  });

  test('read_with_args', async () => {
    const res = await store.read('post', [
      {
        $key: { top: true },
        title: true,
        author: { name: true },
      },
    ]);

    expect(res).toEqual([
      ref(['post', 'p01'], {
        title: 'Post 1 A',
        author: ref(['user', 'ali'], { name: 'Alicia' }),
      }),
    ]);
  });

  test('read_with_page_args', async () => {
    const resPromise = store.read('post', [
      {
        $key: { $first: 1, authorId: 'bob' },
        title: true,
        author: { name: true },
      },
    ]);

    expect(backend.read).toBeCalledWith(
      encodeQuery({
        post: {
          $key: { $first: 1, authorId: 'bob' },
          title: true,
          authorId: true,
        },
      }),
      {},
      expect.any(Function),
    );

    // We do this because the query that backend.read is called with
    // is modified afterwards.
    const res = await resPromise;

    const exp = page({ authorId: 'bob', $until: { id: 'p02' } }, 1, [
      keyref({ $cursor: { id: 'p02' }, authorId: 'bob' }, ['post', 'p02'], {
        title: 'Post 2 B',
        author: ref(['user', 'bob'], { name: 'Robert' }),
      }),
    ]);
    expect(res).toEqual(exp);
  });

  test('parallel_links', async () => {
    const res = await store.read(['user', 'carl'], {
      name: true,
      friends: { $key: { $all: true }, name: true },
    });
    // console.log(res);
    const exp = {
      name: 'Carl',
      friends: page({}, null, [
        keyref(0, ['user', 'ali'], { name: 'Alicia' }),
        keyref(1, ['user', 'bob'], { name: 'Robert' }),
      ]),
    };
    expect(res).toEqual(exp);
  });

  test('no_projection_id', async () => {
    const res = await store.read(['user', 'carl'], true);
    expect(res).toEqual({ name: 'Carl', friendIds: ['ali', 'bob'] });
  });

  test('no_projection_query', async () => {
    const res = await store.read('post', [
      { $key: { $first: 1, authorId: 'bob' } },
    ]);
    const exp = page({ authorId: 'bob', $until: { id: 'p02' } }, 1, [
      keyref({ $cursor: { id: 'p02' }, authorId: 'bob' }, ['post', 'p02'], {
        title: 'Post 2 B',
        authorId: 'bob',
      }),
    ]);
    expect(res).toEqual(exp);
  });
});
