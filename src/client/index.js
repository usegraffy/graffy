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
      // console.log('Opening', url);
      const source = new EventSource(url);
      const [push, stream] = makeStream(() => {
        // console.log('Closing', url);
        source.close();
      });

      source.onmessage = ({ data }) => {
        // console.log('<<<', getPath(query), data);
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
