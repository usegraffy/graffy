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

// TODO: Write tests!

/*
const parsed = url.parse(req.url, true);
const query = parsed.query.q && decodeUrl(parsed.query.q);
const options =
  parsed.query.opts && JSON.parse(decodeURIComponent(parsed.query.opts));

if (req.method === 'GET') {
  try {
    if (req.headers['accept'] === 'text/event-stream') {
      res.setHeader('content-type', 'text/event-stream');

      const keepAlive = setInterval(() => {
        if (req.aborted || res.finished) {
          clearInterval(keepAlive);
          return;
        }
        res.write(': \n\n');
      }, 29000);

      // TODO: Resumable subscriptions using timestamp ID.
      // const lastId = req.headers['last-event-id'];
      try {
        const stream = store.call('watch', query, {
          ...options,
          raw: true,
        });
        for await (const value of stream) {
          if (req.aborted || res.finished) break;
          res.write(`data: ${JSON.stringify(value)}\n\n`);
        }
      } catch (e) {
        res.write(`event: graffyerror\ndata: ${e.message}\n\n`);
      }
      res.end();
    } else {
      const value = await store.call('read', query, {
        ...options,
        raw: true,
      });
      res.writeHead(200);
      res.end(JSON.stringify(value));
    }
  } catch (e) {
    res.writeHead(400);
    res.end(`${e.message}\n\n`);
    return;
  }
} else if (req.method === 'POST') {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const change = JSON.parse(Buffer.concat(chunks).toString());
    const value = await store.call('write', change, options);
    res.writeHead(200);
    res.end(JSON.stringify(value));
  } catch (e) {
    res.writeHead(400);
    res.end(`${e.message}\n\n`);
    return;
  }
} else {
  res.writeHead(501);
  res.end('Not implemented');
}
};

*/
