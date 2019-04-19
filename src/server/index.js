/*
  This will be used in Node.js without transpilation,
  and should be written using CommonJS modules.
*/

import getQuery from './getQuery';

const url = require('url');

export default function server(store) {
  if (!store) throw new Error('server.store_undef');
  return async (req, res) => {
    if (req.method === 'GET') {
      const parsed = url.parse(req.url, true);
      const query = getQuery(parsed.query.include);
      if (req.headers['accept'] === 'text/event-stream') {
        res.setHeader('content-type', 'text/event-stream');

        // TODO: Resumable subscriptions using timestamp ID.
        // const lastId = req.headers['last-event-id'];

        const stream = store.sub(query, { raw: true });
        // TODO: call stream.return() when aborted
        for await (const value of stream) {
          if (req.aborted || res.finished) break;
          res.write(`data: ${JSON.stringify(value)}\n\n`);
        }
        res.end();
      } else {
        const value = await store.get(query, { raw: true });
        res.end(JSON.stringify(value));
      }
    } else {
      res.writeHead(501);
      res.end('Not implemented');
    }
  };
}

// TODO: Write tests!
