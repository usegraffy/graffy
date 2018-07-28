// common/schema.js

import { types } from 'gru';
import { User } from './user';
import { Poke, PokeFilter } from './poke';

const { number, string, cursor } = types;

export default const Schema = {
  users: { [string]: User },
  pokes: { [string]: Poke },
  pokeByTime: { [PokeFilter]: { [cursor(number, string)]: Poke } }
}

// client/DataProvider.js

import { Store, CacheSource, HttpSource } from 'gru';
import { Provider } from 'gru-react';
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

import { filter, range } from 'gru';
import { Read } from 'gru-react';

export default class PokeList extends Component {
  render() {
    const id = this.props.id;
    const asPoker = filter({ role: 'poker' });
    const asPokee = filter({ role: 'pokee' });
    const last10 = range(-10); // Last 10 items

    return (
      <Read path={['users', this.props.id, 'pokes']}, shape={{
        [asPoker]: { [last10]: { message: 1, pokee: { name: 1 } } },
        [asPokee]: { [last10]: { message: 1, poker: { name: 1 } } }
      }}>{({
        [asPoker]: pokesSent,
        [asPokee]: pokesReceived
      }) => (
        <View>
          {this.renderPokes(pokesSent)}
          {this.renderPokes(pokesReceived)}
        </View>
      )}</Read>
    );
  }
}

// server.js

import { Store, RedisCache, fromFilter } from 'gru';
import { createServer } from 'gru-server';
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
