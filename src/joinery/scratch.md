```gql
{
  users(first: 3) {
    name,
    posts(last: 4) {
      title
    }
  },

  post(123) {
    title,
    author: {
      name
    }
  }
}
```

```js
{
  users: [
    { $key: 1, name: 'Alice',
      posts: { $ref: ['posts', { userId: 1, last: 4 }] } },


  ],
  posts: [

  ]
}
```
