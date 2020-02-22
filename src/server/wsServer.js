import WebSocket from 'ws';
export default function server(store) {
  if (!store) throw new Error('server.store_undef');

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', function connection(ws) {
    ws.graffyStreams = {}; // We use this to keep track of streams to close.
    ws.on('message', async function message(msg) {
      try {
        const [op, id, payload, options] = JSON.parse(msg);
        switch (op) {
          case 'read':
          case 'write':
            try {
              const result = await store.call(op, payload, options);
              ws.send(JSON.stringify([id, null, result]));
            } catch (e) {
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
                ws.send(JSON.stringify([id, null, value]));
              }
            } catch (e) {
              ws.send(JSON.stringify([id, e.message]));
            }
            break;
          case 'unwatch':
            if (!ws.graffyStreams[id]) break;
            ws.graffyStreams[id].return();
            delete ws.graffyStreams[id];
        }
      } catch (e) {
        console.log('WebSocket message error', e);
        ws.close();
      }
    });

    ws.on('close', () => {});
  });

  return async (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  };
}
