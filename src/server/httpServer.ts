import url from 'node:url';
import { decodeGraph, decodeQuery, pack, unpack } from '@graffy/common';
import debug from 'debug';

const log = debug('graffy:server:http');

/**
 * @typedef {import('@graffy/core').default} GraffyStore
 * @param {GraffyStore} store
 * @param {object} [options]
 * @param {(operation: string, payload: any, options: any) => Promise<boolean>} [options.auth]
 *   Optional callback to authorize each request. Receives the operation name,
 *   decoded payload, and the filtered options. Return `true` to allow, `false`
 *   (or a rejected promise) to reject with 401.
 * @param {string[]} [options.allowedOptions]
 *   Allowlist of option keys that clients are permitted to pass through to
 *   `store.call` and the `auth` callback. Any key not in this list is stripped
 *   from the client-supplied options before use. Defaults to `[]` (strip all).
 * @returns
 */
export default function server(store, { auth, allowedOptions = [] } = {}) {
  if (!store) throw new Error('server.store_undef');
  return async (req, res) => {
    const parsed = url.parse(req.url, true);

    const optParam = parsed.query.opts && String(parsed.query.opts);
    const rawOptions = optParam && JSON.parse(decodeURIComponent(optParam));
    const safeOptions = Object.fromEntries(
      Object.entries(rawOptions || {}).filter(([k]) =>
        allowedOptions.includes(k),
      ),
    );

    if (req.method === 'GET') {
      try {
        const qParam = parsed.query.q && String(parsed.query.q);
        const query = qParam && unpack(JSON.parse(decodeURIComponent(qParam)));
        if (req.headers.accept === 'text/event-stream') {
          if (auth && !(await auth('watch', decodeQuery(query), safeOptions))) {
            const body = 'unauthorized';
            res.writeHead(401, {
              'Content-Type': 'text/plain',
              'Content-Length': Buffer.byteLength(body),
            });
            res.end(body);
            return;
          }

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
              ...safeOptions,
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
        const body = `${e.message}`;
        res.writeHead(400, {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
      }
    } else if (req.method === 'POST') {
      try {
        const op = parsed.query.op;
        if (op !== 'write' && op !== 'read') {
          throw Error('httpServer.unsupported_op');
        }

        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const payload = unpack(JSON.parse(Buffer.concat(chunks).toString()));

        if (
          auth &&
          !(await auth(
            op,
            (op === 'write' ? decodeGraph : decodeQuery)(payload),
            safeOptions,
          ))
        ) {
          const body = 'unauthorized';
          res.writeHead(401, {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(body),
          });
          res.end(body);
          return;
        }

        const value = await store.call(op, payload, safeOptions);
        const body = JSON.stringify(pack(value));
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
      } catch (e) {
        log(e.message);
        log(e.stack);
        const body = `${e.message}`;
        res.writeHead(400, {
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
      }
    } else {
      const body = 'Not implemented';
      res.writeHead(501, {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(body),
      });
      res.end(body);
    }
  };
}
