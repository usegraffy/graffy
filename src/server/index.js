import url from 'url';
import { decodeUrl } from '@graffy/common';

export default function server(store) {
  if (!store) throw new Error('server.store_undef');
  return async (req, res) => {
    if (req.method === 'GET') {
      try {
        const parsed = url.parse(req.url, true);
        const query = decodeUrl(parsed.query.q);

        if (req.headers['accept'] === 'text/event-stream') {
          res.setHeader('content-type', 'text/event-stream');

          const keepAlive = setInterval(() => {
            if (req.aborted || res.finished) {
              clearInterval(keepAlive);
              return;
            }
            res.write(':stayinalive');
          }, 2000);

          // TODO: Resumable subscriptions using timestamp ID.
          // const lastId = req.headers['last-event-id'];
          try {
            const stream = store.call('watch', query, { raw: true });
            for await (const value of stream) {
              if (req.aborted || res.finished) break;
              res.write(`data: ${JSON.stringify(value)}\n\n`);
            }
          } catch (e) {
            res.write(`event: graffyerror\ndata: ${e.message}\n\n`);
          }
          res.end();
        } else {
          const value = await store.call('read', query, { raw: true });
          res.writeHead(200);
          res.end(JSON.stringify(value));
        }
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
}

// TODO: Write tests!
