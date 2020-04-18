import { makeStream } from '@graffy/stream';
import Socket from './Socket';

export default (url, getOptions) => store => {
  if (!WebSocket) throw Error('client.websocket.unavailable');

  let socket = new Socket(url, { onUnhandled });

  function onUnhandled(id) {
    socket.send([id, 'unwatch']);
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

  store.on('read', (query, options) => once('read', query, options));
  store.on('write', (change, options) => once('write', change, options));

  store.on('watch', (query, options) => {
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
        socket.send([id, 'unwatch']);
        socket.stop(id);
      };
    });
  });
};
