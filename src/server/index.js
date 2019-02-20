/*
  This will be used in Node.js without transpilation,
  and should be written using CommonJS modules.
*/

import { getShape } from '@grue/common';

const url = require('url');

export default class GrueServer {
  grue = s => { this.store = s; }

  http = async (req, res) => {
    if (!this.store) {
      res.writeHead(502);
      res.end('Server not ready');
    }

    if (req.method === 'GET') {
      const parsed = url.parse(req.url, true);
      const path = parsed.pathname;
      const query = getShape(parsed.query.include);
      if (req.headers['accept'] === 'text/event-stream') {
        res.setHeader('content-type', 'text/event-stream');

        // TODO: Resumable subscriptions using timestamp ID.
        // const lastId = req.headers['last-event-id'];

        const stream = this.store.sub(path, query, { values: false });
        for await (const value of stream) {
          if (req.aborted || res.finished) break;
          res.write(`data: ${JSON.stringify(value)}\n\n`);
        }
        res.end();
      } else {
        const value = await this.store.get(path, query, { keepLinks: true });
        res.end(JSON.stringify(value));
      }

    } else {
      res.writeHead(501);
      res.end('Not implemented');
    }
  }
}
