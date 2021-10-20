import Graffy from '@graffy/core';
import { encodeGraph } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import link from './index.js';

describe('link', () => {
  let store, backend;

  beforeEach(() => {
    store = new Graffy();
    backend = mockBackend();
    store.use(
      link({
        'post.$pid.author': ['user', '$$post.$pid.authorId'],
        'user.$uid.posts': ['post', { $all: true, authorId: '$uid' }],
      }),
    );
    store.use(backend.middleware);

    backend.write([{ key: '', end: '\uffff', version: 1 }]); // Set to empty
    backend.write(
      encodeGraph({
        user: {
          ali: { name: 'Alicia' },
          bob: { name: 'Robert' },
        },
        post: [
          { $key: 'p01', title: 'Post 1 A', authorId: 'ali' },
          { $key: 'p02', title: 'Post 2 B', authorId: 'bob' },
          { $key: 'p03', title: 'Post 3 a', authorId: 'ali' },
          { $key: 'p04', title: 'Post 4 b', authorId: 'bob' },

          // Results to the queries we're going to be making
          {
            $key: { $all: true, authorId: 'ali' },
            $chi: [
              { $key: { id: 'p01' }, $ref: ['post', 'p01'] },
              { $key: { id: 'p03' }, $ref: ['post', 'p03'] },
            ],
          },

          {
            $key: { $all: true, authorId: 'bob' },
            $chi: [
              { $key: { id: 'p02' }, $ref: ['post', 'p02'] },
              { $key: { id: 'p04' }, $ref: ['post', 'p04'] },
            ],
          },
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
      author: { $ref: ['user', 'ali'], name: 'Alicia' },
    });
  });

  test('read_multi_backward_link', async () => {
    const res = await store.read('user', {
      ali: { name: true, posts: { $key: { $last: 1 }, title: true } },
      bob: { name: true, posts: { $key: { $first: 1 }, title: true } },
    });
    const exp = {
      ali: {
        name: 'Alicia',
        posts: [
          { $key: { id: 'p03' }, $ref: ['post', 'p03'], title: 'Post 3 a' },
        ],
      },
      bob: {
        name: 'Robert',
        posts: [
          { $key: { id: 'p02' }, $ref: ['post', 'p02'], title: 'Post 2 B' },
        ],
      },
    };

    Object.assign(exp.ali.posts, {
      $page: { $all: true, $since: { id: 'p03' } },
      $next: null,
      $prev: { $last: 1, $before: { id: 'p03' } },
      $ref: ['post', { authorId: 'ali' }],
    });

    Object.assign(exp.bob.posts, {
      $page: { $all: true, $until: { id: 'p02' } },
      $next: { $first: 1, $after: { id: 'p02' } },
      $prev: null,
      $ref: ['post', { authorId: 'bob' }],
    });

    expect(res).toEqual(exp);
  });
});
