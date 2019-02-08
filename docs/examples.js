// common/schema.js

import { types } from 'grue';
import { User } from './user';
import { Poke, PokeFilter } from './poke';

const { number, string, map } = types;

export default Schema = {
  users: map(string, User),
  pokes: map(string, Poke),
  pokeByTime: map(PokeFilter, map(tuple(number, string), Poke))
}

/*
DSL Option 1:

  type Schema {
    users: [ string: User ],
    pokes: [ string: User ],
    pokeByTime: [ (PokeFilter, number, string) : Poke ]
  }

Tuple:  (type1, type2, ...)
Struct: { name1: type1, name2: type2, ... }

Set:    { boundedType }
Map:    [ boundedType: type ]
List:   [ type ]

What is a bounded type?
- Scalars
- Tuples containing only bounded types
- Structs containing only bounded types

Sets, Maps and Lists are always unbounded even if their members have bounded types.

---------------------------------------------------

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

*/

// client/DataProvider.js

import { Store, CacheSource, HttpSource } from 'grue';
import { Provider } from 'grue-react';
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

import { filter, range } from 'grue';
import { Read } from 'grue-react';

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

import { Store, RedisCache, fromFilter } from 'grue';
import { createServer } from 'grue-server';
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
