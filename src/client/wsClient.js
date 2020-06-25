import { makeStream } from '@graffy/stream';
import { makePath, makeWatcher } from '@graffy/common';
import Socket from './Socket';

export default (
  url,
  { getOptions = () => {}, noWatch = false, connInfoPath = '/connection' } = {},
) => (store) => {
  if (!WebSocket) throw Error('client.websocket.unavailable');
  connInfoPath = makePath(connInfoPath);

  const socket = new Socket(url, { onUnhandled, onStatusChange });
  let status = false;
  const statusWatcher = makeWatcher();

  function onUnhandled(id) {
    socket.stop(id, ['unwatch']);
  }

  function onStatusChange(newStatus) {
    status = newStatus;
    statusWatcher.write({ status });
  }

  function once(op, payload, options) {
    return new Promise((resolve, reject) => {
      const id = socket.start(
        [op, payload, getOptions(op, options)],
        (error, result) => {
          socket.stop(id);
          error ? reject(Error('server.' + error)) : resolve(result);
        },
      );
    });
  }

  store.onWrite(connInfoPath, () => {
    status = socket.isAlive();
    return { status };
  });
  store.onRead(connInfoPath, () => ({ status }));
  store.onWatch(connInfoPath, () => statusWatcher.watch({ status }));

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
            end(Error('server.' + error));
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
