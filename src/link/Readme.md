# Graffy Link

Graffy module for constructing links using an intuitive, declarative notation.

## Example

Consider a blog data model, with posts and users. Every post has an `authorId`
property, and we would like a property `author` on posts (which link to the
author), and a property `posts` on users, which link to an array of posts
authored by that user.

This is accomplished using:

```js
import Graffy from '@graffy/core';
import link from '@graffy/link';

const store = new Graffy();
store.use(link({
    'posts.$key.author': ['users', '$$posts.$key.authorId'],
    'users.$key.posts': ['posts', { $all: true, authorId: '$$users.$key.id' }]
}));

// Add downstream providers to the store
```

## Link definitions

The link module must be initialized with an object containing a set of link
definitions.

- Each link definition consists of two paths, the _source_ and the _target_.
  The source path must be a dot-separated string. The target path must be an
  array of strings or argument objects.
- The source may contain _wildcard_ segments starting with `$` and followed by
  an arbitrary name. Wildcards that were _defined_ in a source path may be
  included in the target path, where they are replaced with matched keys from
  the query.
- The target may include _lookup_ strings starting with `$$` and followed by
  dot-separated string paths (possibly including wildcards). These are replaced
  with values returned by downstream providers.

See [Graffy documentation](https://aravindet.github.io/graffy/) for more.
