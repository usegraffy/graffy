import { getInclude } from '@grue/common';

export default function GrueClient(baseUrl) {
  return function(store) {
    store.onGet(({ query, token }) => {
      const url = `${baseUrl}?include=${getInclude(query)}`;

      if (!token) {
        if (!fetch) throw Error('client.fetch.unavailable');
        return fetch(url).then(res => res.json());
      }

      if (!EventSource) throw Error('client.sse.unavailable');
      return new Promise((resolve, reject) => {
        const source = new EventSource(url);
        let resolved = false;
        source.onmessage = ({ data }) => {
          if (resolved) {
            store.pub(JSON.parse(data));
          } else {
            resolve(JSON.parse(data));
            resolved = true;
          }
        };
        source.onerror = e => {
          if (!resolved) reject(e);
        };
        token.onSignal(() => {
          source.close();
        });
      });
    });
  };
}
