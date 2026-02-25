import { decodeGraph, decodeQuery, pack, unpack } from '@graffy/common';
import { WebSocketServer } from 'ws';

import debug from 'debug';

const log = debug('graffy:server:ws');

const PING_INTERVAL = 30000;

/**
 * @typedef {import('@graffy/core').default} GraffyStore
 * @param {GraffyStore} store
 * @param {object} [options]
 * @param {(operation: string, payload: any, options: any) => Promise<boolean>} [options.auth]
 *   Optional callback to authorize each request. Receives the operation name,
 *   decoded payload, and the filtered options. Return `true` to allow, `false`
 *   (or a rejected promise) to reject with an error response.
 * @param {string[]} [options.allowedOptions]
 *   Allowlist of option keys that clients are permitted to pass through to
 *   `store.call` and the `auth` callback. Any key not in this list is stripped
 *   from the client-supplied options before use. Defaults to `[]` (strip all).
 * @returns
 */
export default function server(store, { auth, allowedOptions = [] } = {}) {
  if (!store) throw new Error('server.store_undef');

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', function connection(ws) {
    ws.graffyStreams = {}; // We use this to keep track of streams to close.
    ws.on('message', async function message(msg) {
      try {
        const [id, op, packedPayload, rawOptions] = JSON.parse(msg);
        const safeOptions = Object.fromEntries(
          Object.entries(rawOptions || {}).filter(([k]) =>
            allowedOptions.includes(k),
          ),
        );
        const payload = unpack(packedPayload);

        if (id === ':pong') {
          ws.pingPending = false;
          return;
        }

        if (auth && op !== 'unwatch') {
          const decoded =
            op === 'write' ? decodeGraph(payload) : decodeQuery(payload);
          if (!(await auth(op, decoded, safeOptions))) {
            ws.send(JSON.stringify([id, 'unauthorized']));
            return;
          }
        }

        switch (op) {
          case 'read':
          case 'write':
            try {
              const result = await store.call(op, payload, safeOptions);
              ws.send(JSON.stringify([id, null, pack(result)]));
            } catch (e) {
              log(`${op}error:${e.message} ${payload}`);
              ws.send(JSON.stringify([id, e.message]));
            }
            break;
          case 'watch':
            try {
              const stream = store.call('watch', payload, {
                ...safeOptions,
                raw: true,
              });

              ws.graffyStreams[id] = stream;

              for await (const value of stream) {
                ws.send(JSON.stringify([id, null, pack(value)]));
              }
            } catch (e) {
              log(`${op}error:${e.message} ${payload}`);
              ws.send(JSON.stringify([id, e.message]));
            }
            break;
          case 'unwatch':
            if (!ws.graffyStreams[id]) break;
            ws.graffyStreams[id].return();
            delete ws.graffyStreams[id];
            break;
        }
      } catch (e) {
        log(`Closing socket due to error: ${e.message}`);
        ws.close();
      }
    });

    ws.on('close', () => {
      for (const id in ws.graffyStreams) {
        ws.graffyStreams[id].return();
        delete ws.graffyStreams[id];
      }
    });
  });

  setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.pingPending) return ws.terminate();
      ws.pingPending = true;
      ws.send(JSON.stringify([':ping', Date.now()]));
    });
  }, PING_INTERVAL);

  return async (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  };
}
