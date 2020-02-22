import makeStream from '@graffy/stream';
import { makeId } from '@graffy/common';

export default (url, getOptions) => store => {
  if (!WebSocket) throw Error('client.websocket.unavailable');

  let socket;
  const handlers = {};

  function connect() {
    socket = new WebSocket(url);
    socket.onmessage = receive;
  }

  connect();

  /*
    TODO:
    - Request buffering while connection isn't open
    - Reconnection, backoff, health heuristics
  */

  function receive(event) {
    const [id, ...data] = JSON.parse(event.data);
    if (handlers[id]) {
      handlers[id](...data);
    } else {
      // We received an unexpected push.
      socket.send(JSON.stringify(['unwatch', id]));
    }
  }

  function once(op, payload, options) {
    const id = makeId();
    socket.send(JSON.stringify([op, id, payload, getOptions(op, options)]));
    return new Promise((resolve, reject) => {
      handlers[id] = (error, result) => {
        delete handlers[id];
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      };
    });
  }

  store.on('read', (query, options) => once('read', query, options));
  store.on('write', (change, options) => once('write', change, options));

  store.on('watch', (query, options) => {
    const id = makeId();
    const op = 'watch';
    socket.send(JSON.stringify([op, id, query, getOptions(op, options)]));

    return makeStream((push, end) => {
      handlers[id] = (error, result) => {
        if (error) {
          delete handlers[id];
          end(error);
          return;
        }
        push(result);
      };

      return () => {
        socket.send(JSON.stringify(['unwatch', id]));
        delete handlers[id];
      };
    });
  });
};
