1.

```js
{ a: true, b: { c: true } }
```

```
a,b(c)
```

2.

```js
{
  a: ['*', 'c', { f: true, h: true }];
}
```

```
a(*/c/f,h)
```

3.

```js
{
  a: [['b', 'd'], 'c', { f: true, h: true }];
}
```

```
a(b,d/c/f,h)
```
