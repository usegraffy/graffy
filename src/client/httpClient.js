import {
  encodeUrl,
  serialize,
  deserialize,
  makePath,
  add,
} from '@graffy/common';
import { makeStream } from '@graffy/stream';

function getOptionsParam(options) {
  if (!options) return '';
  return encodeURIComponent(serialize(options));
}
const aggregateQueries = {};

class AggregateQuery {
  combinedQuery = [];
  readers = [];
  timer = null;

  constructor(url) {
    this.url = url;
  }

  add(query) {
    add(this.combinedQuery, query);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.doFetch(), 0);
    return new Promise((resolve, reject) => {
      this.readers.push({ query, resolve, reject });
    });
  }

  async doFetch() {
    delete aggregateQueries[this.url];
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialize(this.combinedQuery),
    });
    if (response.status !== 200) {
      const message = await response.text();
      const err = new Error(message);
      for (const reader of this.readers) {
        reader.reject(err);
      }
      return;
    }
    const data = await response.json();
    for (const reader of this.readers) {
      reader.resolve(data);
    }
  }
}

function makeQuery(url, query) {
  if (!aggregateQueries[url]) aggregateQueries[url] = new AggregateQuery(url);
  return aggregateQueries[url].add(query);
}

const httpClient =
  (
    baseUrl,
    { getOptions = async () => {}, watch, connInfoPath = 'connection' } = {},
  ) =>
  (store) => {
    connInfoPath = makePath(connInfoPath);

    store.onWrite(connInfoPath, ({ url }) => {
      baseUrl = url;
      return { url };
    });
    store.onRead(connInfoPath, () => ({ url: baseUrl }));

    store.on('read', async (query, options) => {
      if (!fetch) throw Error('client.fetch.unavailable');
      const optionsParam = getOptionsParam(await getOptions('read', options));
      const url = `${baseUrl}?opts=${optionsParam}&op=read`;
      return makeQuery(url, query);
    });

    store.on('watch', async function* (query, options) {
      if (watch === 'none') throw Error('client.no_watch');
      if (watch === 'hang') {
        yield* makeStream((push) => {
          push(undefined);
        });
        return;
      }
      if (!EventSource) throw Error('client.sse.unavailable');
      const optionsParam = getOptionsParam(await getOptions('watch', options));
      const url = `${baseUrl}?q=${encodeUrl(query)}&opts=${optionsParam}`;
      const source = new EventSource(url);

      yield* makeStream((push, end) => {
        source.onmessage = ({ data }) => {
          push(deserialize(data));
        };

        source.onerror = (e) => {
          end(Error('client.sse.transport: ' + e.message));
        };

        source.addEventListener('graffyerror', (e) => {
          end(Error('server.' + e.data));
        });

        return () => {
          source.close();
        };
      });
    });

    store.on('write', async (change, options) => {
      if (!fetch) throw Error('client.fetch.unavailable');
      const optionsParam = getOptionsParam(await getOptions('write', options));
      const url = `${baseUrl}?opts=${optionsParam}&op=write`;
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serialize(change),
      }).then((res) => {
        if (res.status === 200) return res.json();
        return res.text().then((message) => {
          throw Error('server.' + message);
        });
      });
    });
  };

export default httpClient;
