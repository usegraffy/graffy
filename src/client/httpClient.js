import { encodeUrl, serialize, deserialize } from '@graffy/common';
import { makeStream } from '@graffy/stream';

export default (baseUrl, { getOptions = () => {} } = {}) => (store) => {
  store.on('read', (query, options) => {
    if (!fetch) throw Error('client.fetch.unavailable');
    const encodedOptions = encodeURIComponent(
      serialize(getOptions('read', options)),
    );
    const url = `${baseUrl}?q=${encodeUrl(query)}&opts=${encodedOptions}`;
    return fetch(url).then((res) => {
      if (res.status === 200) return res.json();
      return res.text().then((message) => {
        throw Error('server.' + message);
      });
    });
  });

  store.on('watch', (query, options) => {
    if (!EventSource) throw Error('client.sse.unavailable');
    const encodedOptions = encodeURIComponent(
      serialize(getOptions('watch', options)),
    );
    const url = `${baseUrl}?q=${encodeUrl(query)}&opts=${encodedOptions}`;
    const source = new EventSource(url);

    return makeStream((push, end) => {
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

  store.on('write', (change, options) => {
    if (!fetch) throw Error('client.fetch.unavailable');
    const encodedOptions = encodeURIComponent(
      serialize(getOptions('write', options)),
    );
    const url = `${baseUrl}?opts=${encodedOptions}`;
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
