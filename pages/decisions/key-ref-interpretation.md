How do we interpret:

```
{
  foo: { $ref: bar, $key: baz, $val: 2 }
}
```

# Option 1

$ref before $key

```
{
  foo: { $ref: bar },
  bar: { baz: 2 }
}
```

# Option 2

$key before $ref

```
{
  foo: { baz: { $ref: bar } },
  bar: 2
}
```

# Index

The normal index pattern is

```
{
  foo: [
    { $key: 1, $ref: f1 },
    { $key: 2, $ref: f2 }
  ]
}
```

This MUST interpreted as per option 2, key before ref.

# Alias

Ideally we would have used the option 1 interpretation, but as it is inconsistent with the indexes, we use this alternative way to specify aliases:

```
{
  foo: { $ref: [bar, baz], $val: 2 }
}
```
