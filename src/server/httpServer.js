import url from 'url';
import { encodeGraph, encodeQuery, pack, unpack } from '@graffy/common';
import debug from 'debug';

const log = debug('graffy:server:http');

/**
 * @typedef {import('@graffy/core').default} GraffyStore
 * @param {GraffyStore} store
 * @param {{
 *   auth?: (operation: string, payload: any, options: any) => Promise<boolean>
 * } | undefined} options
 * @returns
 */
export default function server(store, { auth } = {}) {
  if (!store) throw new Error('server.store_undef');
  return async (req, res) => {
    const parsed = url.parse(req.url, true);

    const optParam = parsed.query.opts && String(parsed.query.opts);
    const options = optParam && JSON.parse(decodeURIComponent(optParam));

    if (req.method === 'GET') {
      const qParam = parsed.query.q && String(parsed.query.q);
      const query = qParam && unpack(JSON.parse(decodeURIComponent(qParam)));
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
              res.write(`data: ${JSON.stringify(pack(value))}\n\n`);
            }
          } catch (e) {
            log(e);
            res.write(`event: graffyerror\ndata: ${e.message}\n\n`);
          }
          res.end();
        } else {
          throw Error('httpServer.get_unsupported');
        }
      } catch (e) {
        log(e.message);
        log(e.stack);
        res.writeHead(400);
        res.end(`${e.message}`);
      }
    } else if (req.method === 'POST') {
      try {
        const op = parsed.query.op;
        if (op !== 'write' && op !== 'read') {
          throw Error('httpServer.unsupported_op: ' + op);
        }

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const payload = unpack(JSON.parse(Buffer.concat(chunks).toString()));

        if (
          auth &&
          !(await auth(
            op,
            (op === 'write' ? encodeGraph : encodeQuery)(payload),
            options,
          ))
        ) {
          res.writeHead(401);
          res.end('unauthorized');
          return;
        }

        const value = await store.call(op, payload, options);
        res.writeHead(200);
        res.end(JSON.stringify(pack(value)));
      } catch (e) {
        log(e.message);
        log(e.stack);
        res.writeHead(400);
        res.end(`${e.message}`);
      }
    } else {
      res.writeHead(501);
      res.end('Not implemented');
    }
  };
}
