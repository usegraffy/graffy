import getPath from './getPath';

export default function GraffyClient(baseUrl) {
  return function(store) {
    store.onGet((query, { token }) => {
      const url = `${baseUrl}?include=${getPath(query)}`;

      if (!token) {
        if (!fetch) throw Error('client.fetch.unavailable');
        return fetch(url).then(res => res.json());
      }

      if (!EventSource) throw Error('client.sse.unavailable');
      return new Promise((resolve, reject) => {
        const source = new EventSource(url);
        let resolved = false;
        source.onmessage = ({ data }) => {
          data = JSON.parse(data);
          if (resolved) {
            store.pub(data);
          } else {
            resolve(data);
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
