import debug from 'debug';
export const config = {
  connection: {
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE,
  },
  poolOption: {
    /**
     * The maximum number of connections that can be created
     * in the pool at any one time.
     */
    max: 10,
  },
  handlers: {
    // onQueryStart,onQueryResults,onQueryError,onConnectionOpened, onConnectionClosed will be include in next version
    onError: (err) => {
      if (!/connection\s*terminated\s*unexpectedly/i.test(err.message)) {
        debug(`graffy:pg:error`)(
          `Error in Postgres ConnectionPool: ${err.message}`,
        );
      }
    },
  },
};
