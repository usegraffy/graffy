import Graffy from '../Graffy';
import fill from '@graffy/fill';

describe('ref', () => {
  let store;
  let postProvider;
  let userProvider;

  let ref;

  beforeEach(() => {
    store = new Graffy();
    store.use(fill());

    postProvider = jest.fn((_query) => {
      return null;
    });

    userProvider = jest.fn((query) => {
      const res = Object.keys(query).reduce((res, id) => {
        res[id] = {
          id,
          posts: { $ref: ['posts', ref(id)] },
        };
        return res;
      }, {});
      return res;
    });

    store.onRead('users', userProvider);
    store.onRead('posts', postProvider);
  });

  test('simple', async () => {
    ref = (id) => `post-${id}`;
    const res = await store.read({
      users: { abc: { id: true, posts: { title: true } } },
    });

    const posts = { $ref: ['posts', 'post-abc'], title: null };
    const expected = {
      users: { abc: { id: 'abc', posts } },
      posts: { 'post-abc': posts },
    };

    expect(postProvider).toBeCalledTimes(1);
    expect(postProvider.mock.calls[0][0]).toEqual({
      'post-abc': { title: true },
    });
    expect(res).toEqual(expected);
  });

  test('simple then range', async () => {
    ref = (id) => `post-${id}`;
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

  test('range then simple', async () => {
    ref = (id) => ({ authorId: id, $all: true });
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

  test('merge ranges', async () => {
    ref = (id) => ({ authorId: id, $all: true });
    const res = await store.read({
      users: {
        abc: { id: true, posts: [{ $key: { $first: 2 }, title: true }] },
      },
    });

    const posts = [];
    posts.$ref = ['posts'];
    const expected = {
      users: { abc: { id: 'abc', posts } },
      posts,
    };

    expect(postProvider).toBeCalledTimes(1);
    expect(postProvider.mock.calls[0][0]).toEqual({
      $key: { $first: 2, authorId: 'abc' },
      title: true,
    });
    expect(res).toEqual(expected);
  });
});
