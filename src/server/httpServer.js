import url from 'url';
import { decodeUrl, serialize, deserialize } from '@graffy/common';
import debug from 'debug';

const log = debug('graffy:server:http');

export default function server(store) {
  if (!store) throw new Error('server.store_undef');
  return async (req, res) => {
    const parsed = url.parse(req.url, true);
    const query = parsed.query.q && decodeUrl(parsed.query.q);
    const options =
      parsed.query.opts && deserialize(decodeURIComponent(parsed.query.opts));

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
              res.write(`data: ${serialize(value)}\n\n`);
            }
          } catch (e) {
            log(e);
            res.write(`event: graffyerror\ndata: ${e.message}\n\n`);
          }
          res.end();
        } else {
          return log('Get not supported for this type. Try POST');
        }
      } catch (e) {
        log(e);
        res.writeHead(400);
        res.end(`${e.message}`);
        return;
      }
    } else if (req.method === 'POST') {
      try {
        const op = req.query.op;
        if (op !== 'write' && op !== 'read') {
          throw Error('httpServer.unsupported_op: ' + op);
        }
        
        // TODO: Sanitize options for security.
        if (op === 'read') options.raw = true;
        
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const payload = deserialize(Buffer.concat(chunks).toString());
        
        const value = await store.call(op, payload, options);
        res.writeHead(200);
        res.end(serialize(value));
      } catch (e) {
        res.writeHead(400);
        res.end(`${e.message}`);
        return;
      }
    } else {
      res.writeHead(501);
      res.end('Not implemented');
    }
  };
}

// TODO: Write tests!
