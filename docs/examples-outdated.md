```js
// common/schema.js

import { types } from 'graffy';
import { User } from './user';
import { Poke, PokeFilter } from './poke';

const { number, string, map } = types;

export default (Schema = {
  users: map(string, User),
  pokes: map(string, Poke),
  pokeByTime: map(PokeFilter, map(tuple(number, string), Poke)),
});
```

DSL Option 1:

type Schema {
users: [ string: User ],
pokes: [ string: User ],
pokeByTime: [ (PokeFilter, number, string) : Poke ]
}

Tuple: (type1, type2, ...)
Struct: { name1: type1, name2: type2, ... }

Set: { boundedType }
Map: [ boundedType: type ]
List: [ type ]

What is a bounded type?

- Scalars
- Tuples containing only bounded types
- Structs containing only bounded types

Sets, Maps and Lists are always unbounded even if their members have bounded types.

---

JSON Option 2:

export default const Schema = {
users: [ string, User ],
pokes: [ string, User ],
pokesByTime: [ PokeFilter, [number, string], Poke ]
}

Array with one element: List of that type
Array with two elements: Map from first type to second type
Array with N elements: Map from typle of types (1 ... N-1) to the Nth type

It is not possible to represent a tuple in the value position.

```js

// client/DataProvider.js

import { Store, CacheSource, HttpSource } from 'graffy';
import { Provider } from 'graffy-react';
import schema from './schema';

export default class DataProvider extends Component {
  constructor() {
    this.store = new Store(schema);
    store.use(new CacheSource());
    store.use(new HttpSource(url));
  }

  render() {
    return <Provider store={store}>{this.props.children}</Provider>;
  }
}

// client/PokeList.js

import { filter, range } from 'graffy';
import { Read } from 'graffy-react';

export default class PokeList extends Component {
  render() {
    return (
      <Read path={['users', this.props.id, 'pokes']}, shape={{
        asPoker: slice(
          { role: 'poker', last: 10 },
          { message: 1, pokee: { name: 1 } }
        ),
        asPokee: slice(
          { role: 'pokee', last: 10 },
          { message: 1, pokee: { name: 1 } }
        )
      }}>{({ asPoker, asPokee }) => (
        <View>
          {this.renderPokes(pokesSent)}
          {this.renderPokes(pokesReceived)}
        </View>
      )}</Read>
    );
  }
}

// server.js

import { Store, RedisCache, fromFilter } from 'graffy';
import { createServer } from 'graffy-server';
import { pokeSource, pokesByTimeSource, userSource } from './sources';
import schema from './schema';

const store = new Store(schema);
const server = createServer(store);

app.use('/api', server);

store.use(new RedisCache(redisConfig));
store.use('/users', userSource);
store.use('/pokes', pokeSource);
store.use('/pokesByTime', pokesByTimeSource);
store.use('/users/:id/pokes', (shape, { id }) => {
  const filteredShape = {};
  for (const key in shape) {
    const { role } = decode(key);
    if (role === 'poker') filteredShape[encode({ poker: id })] = shape[key];
    if (role === 'pokee') filteredShape[encode({ pokee: id })] = shape[key];
  }
  return pokesByTimeSource(filteredShape);
});

// Store example

import Store from './Store';

const wait = time => new Promise(resolve => setTimeout(resolve, time));

describe('store', () => {
  let store;

  before(() => {
    store = new Store();

    store.onRead('pokes/:id', async function (req, res) {
      const ids = req.params.map(({ id }) => id);
      await wait(50);
      ids.forEach(id => res.send({ `pokes/${id}`: { message: `Hi ${id} 0` }}));
      if (!req.live) return;
      let i = 1;
      while (true) {
        await wait(2000);
        const id = ids[Math.floor(Math.random() * ids.length)];
        res.send({ `pokes/${id}`: { message: `Hi ${id} ${i}` }});
        i++;
      }
    });
  });

  test('get keys', () => {
    const a = await store.get('pokes/a', { message });
    const b = await store.get('pokes/b', { message });
    expect(a).toEqual({ message: 'Hi a 0' });
    expect(b).toEqual({ message: 'Hi b 0' });
  });

  test('watch a key', () => {
    let i = 0;
    for await (const a of store.watch('pokes/a', { message })) {
      expect(a).toEqual({ message: `Hi a ${i}` });
      i++;
      if (i >= 4) break;
    }
  });
});


```
