import { makeWatcher, pack, unpack } from '@graffy/common';
import { makeStream } from '@graffy/stream';
import Socket from './Socket.js';

const wsClient =
  (
    url,
    {
      getOptions = (..._) => false,
      watch = undefined,
      connInfoPath = 'connection',
    } = {},
  ) =>
  (store) => {
    if (!WebSocket) throw Error('client.websocket.unavailable');

    const socket = Socket(url, { onUnhandled, onStatusChange });
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
          [op, pack(payload), getOptions(op, options) || {}],
          (error, result) => {
            socket.stop(id);
            error ? reject(Error(`server.${error}`)) : resolve(unpack(result));
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
      if (watch === 'none') throw Error('client.no_watch');
      const op = 'watch';
      return makeStream((push, end) => {
        const id = socket.start(
          [op, pack(query), getOptions(op, options) || {}],
          (error, result) => {
            if (error) {
              socket.stop(id);
              end(Error(`server.${error}`));
              return;
            }
            push(unpack(result));
          },
        );

        return () => {
          socket.stop(id, ['unwatch']);
        };
      });
    });
  };

export default wsClient;
