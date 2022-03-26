## "Computed subtree"

```
graffy.use('computed', computed({
  cachePath: 'cache',
  transform: (input) => ({ ... }),
  collection: ['users', { }],
  projection: []
}))




```

```gql
{
  deals(by:'amount$desc', first: 3) {
    name
    related: { name }
    dealContact(first: 10) {
      name
    }
  }
}
```

State of the watch:
- watch watermark
- impliedEnd of the deals query
- paths of each related (3) <- not required if using a join
- paths of each dealContact (3) <- not required if using a join
  - impliedEnd of each dealContact query (3)


Use a resume ID option to allow different providers to store this information.


## Filter operators

We will support the following
eq
ne
lt
lte
gt
gte
in
nin

ct // For finding an element in an array.
nct

all
any
not
