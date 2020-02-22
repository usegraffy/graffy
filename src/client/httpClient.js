import { encodeUrl } from '@graffy/common';
import makeStream from '@graffy/stream';

export default (baseUrl, getOptions) => store => {
  store.on('read', (query, options) => {
    if (!fetch) throw Error('client.fetch.unavailable');
    const encodedOptions = encodeURIComponent(
      JSON.stringify(getOptions('read', options)),
    );
    const url = `${baseUrl}?q=${encodeUrl(query)}&opts=${encodedOptions}`;
    return fetch(url).then(res => res.json());
  });

  store.on('watch', (query, options) => {
    if (!EventSource) throw Error('client.sse.unavailable');
    const encodedOptions = encodeURIComponent(
      JSON.stringify(getOptions('watch', options)),
    );
    const url = `${baseUrl}?q=${encodeUrl(query)}&opts=${encodedOptions}`;
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

  store.on('write', (change, options) => {
    if (!fetch) throw Error('client.fetch.unavailable');
    const encodedOptions = encodeURIComponent(
      JSON.stringify(getOptions('write', options)),
    );
    const url = `${baseUrl}?opts=${encodedOptions}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    }).then(res => res.json());
  });
};
