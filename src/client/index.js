import { encodeUrl } from '@graffy/common';
import makeStream from '@graffy/stream';

export default function GraffyClient(baseUrl) {
  return function(store) {
    store.on('read', query => {
      if (!fetch) throw Error('client.fetch.unavailable');
      const url = `${baseUrl}?q=${encodeUrl(query)}`;
      return fetch(url).then(res => res.json());
    });

    store.on('watch', query => {
      if (!EventSource) throw Error('client.sse.unavailable');
      const url = `${baseUrl}?q=${encodeUrl(query)}`;
      const source = new EventSource(url);

      return makeStream((push, end) => {
        source.onmessage = ({ data }) => {
          push(JSON.parse(data));
        };

        source.onerror = e => {
          end(Error('client.sse.transport: ' + e.message));
        };

        source.addEventListener('graffyerror', e => {
          end(Error('server:' + e.data));
        });

        return () => {
          source.close();
        };
      });
    });

    store.on('write', change => {
      if (!fetch) throw Error('client.fetch.unavailable');
      console.log('Making post');
      return fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      }).then(res => res.json());
    });
  };
}
