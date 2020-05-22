import { makeStream } from '@graffy/stream';
import { makePath } from '@graffy/common';
import cache from '@graffy/cache';
import Socket from './Socket';

export default (
  url,
  { getOptions = () => {}, noWatch = false, connInfoPath = '/connection' } = {},
) => (store) => {
  if (!WebSocket) throw Error('client.websocket.unavailable');
  connInfoPath = makePath(connInfoPath);

  let socket = new Socket(url, { onUnhandled, onStatusChange });

  function onUnhandled(id) {
    socket.stop(id, ['unwatch']);
  }

  function onStatusChange(status) {
    store.write(connInfoPath, { status });
  }

  function once(op, payload, options) {
    return new Promise((resolve, reject) => {
      const id = socket.start(
        [op, payload, getOptions(op, options)],
        (error, result) => {
          socket.stop(id);
          error ? reject(new Error(error)) : resolve(result);
        },
      );
    });
  }

  store.on('write', [...connInfoPath, 'status'], () => {
    socket.isAlive();
    return [];
  });

  store.use(connInfoPath, cache({ final: true }));

  store.on('read', (query, options) => once('read', query, options));
  store.on('write', (change, options) => once('write', change, options));

  store.on('watch', (query, options) => {
    if (noWatch) throw Error('client.no_watch');
    const op = 'watch';
    return makeStream((push, end) => {
      const id = socket.start(
        [op, query, getOptions(op, options)],
        (error, result) => {
          if (error) {
            socket.stop(id);
            end(new Error(error));
            return;
          }
          push(result);
        },
      );

      return () => {
        socket.stop(id, ['unwatch']);
      };
    });
  });
};
