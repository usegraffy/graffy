import { makeStream } from '@graffy/common';
import { encodeUrl } from '@graffy/common';

export default function GraffyClient(baseUrl) {
  return function(store) {
    store.onGet(query => {
      if (!fetch) throw Error('client.fetch.unavailable');
      const url = `${baseUrl}?q=${encodeUrl(query)}`;
      return fetch(url).then(res => res.json());
    });

    store.onSub(query => {
      if (!EventSource) throw Error('client.sse.unavailable');
      const url = `${baseUrl}?q=${encodeUrl(query)}`;
      // console.log('Opening', url);
      const source = new EventSource(url);

      return makeStream((push, end) => {
        source.onmessage = ({ data }) => {
          console.log('<<<', data);
          data = JSON.parse(data);
          push(data);
        };

        source.onerror = e => {
          // eslint-disable-next-line no-console
          if (console && console.error) console.error(e);
          end(e);
        };

        return () => {
          // console.log('Closing', url);
          source.close();
        };
      });
    });
  };
}
