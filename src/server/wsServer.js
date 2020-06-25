import WebSocket from 'ws';
import { serialize, deserialize } from '@graffy/common';

const PING_INTERVAL = 30000;

export default function server(store) {
  if (!store) throw new Error('server.store_undef');

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', function connection(ws) {
    ws.graffyStreams = {}; // We use this to keep track of streams to close.
    ws.on('message', async function message(msg) {
      try {
        const [id, op, payload, options] = deserialize(msg);

        if (id === ':pong') {
          ws.pingPending = false;
          return;
        }

        switch (op) {
          case 'read':
          case 'write':
            try {
              const result = await store.call(op, payload, options);
              ws.send(serialize([id, null, result]));
            } catch (e) {
              ws.send(serialize([id, e.message]));
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
                ws.send(serialize([id, null, value]));
              }
            } catch (e) {
              ws.send(serialize([id, e.message]));
            }
            break;
          case 'unwatch':
            if (!ws.graffyStreams[id]) break;
            ws.graffyStreams[id].return();
            delete ws.graffyStreams[id];
            break;
        }
      } catch (_) {
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
      ws.send(serialize([':ping', Date.now()]));
    });
  }, PING_INTERVAL);

  return async (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  };
}
