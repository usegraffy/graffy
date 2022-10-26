import { WebSocketServer } from 'ws';
import { pack, unpack } from '@graffy/common';
// import { format } from '@graffy/testing';
import debug from 'debug';

const log = debug('graffy:server:ws');

const PING_INTERVAL = 30000;

export default function server(store) {
  if (!store) throw new Error('server.store_undef');

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', function connection(ws) {
    ws.graffyStreams = {}; // We use this to keep track of streams to close.
    ws.on('message', async function message(msg) {
      try {
        const [id, op, packedPayload, options] = JSON.parse(msg);
        const payload = unpack(packedPayload);

        if (id === ':pong') {
          ws.pingPending = false;
          return;
        }

        switch (op) {
          case 'read':
          case 'write':
            try {
              const result = await store.call(op, payload, options);
              ws.send(JSON.stringify([id, null, pack(result)]));
            } catch (e) {
              log(op + 'error:' + e.message + ' ' + payload);
              ws.send(JSON.stringify([id, e.message]));
            }
            break;
          case 'watch':
            try {
              const stream = store.call('watch', payload, {
                ...options,
                raw: true,
              });

              ws.graffyStreams[id] = stream;

              for await (const value of stream) {
                ws.send(JSON.stringify([id, null, pack(value)]));
              }
            } catch (e) {
              log(op + 'error:' + e.message + ' ' + payload);
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
        log('Closing socket due to error: ' + e.message);
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
