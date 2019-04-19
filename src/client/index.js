import { makeStream } from '@graffy/common';
import getPath from './getPath';

export default function GraffyClient(baseUrl) {
  return function(store) {
    store.onGet(query => {
      if (!fetch) throw Error('client.fetch.unavailable');
      const url = `${baseUrl}?include=${getPath(query)}`;
      return fetch(url).then(res => res.json());
    });

    store.onSub(query => {
      if (!EventSource) throw Error('client.sse.unavailable');
      const url = `${baseUrl}?include=${getPath(query)}`;
      const source = new EventSource(url);
      const [stream, push] = makeStream(() => {
        source.close();
      });

      source.onmessage = ({ data }) => {
        data = JSON.parse(data);
        push(data);
      };

      source.onerror = e => {
        // eslint-disable-next-line no-console
        if (console && console.error) console.error(e);
        stream.return();
      };

      return stream;
    });
  };
}
