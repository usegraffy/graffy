import React, { useState, useEffect } from 'react';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import GraffyClient from '@graffy/client';
import { GraffyProvider } from '@graffy/react';

import Query from './Query';
import Result from './Result';

export default function Explore({ baseUrl = '/' }) {
  const [query, setQuery] = useState({});
  const [store, setStore] = useState();

  useEffect(() => {
    const store = new Graffy();
    store.use(GraffyFill());
    store.use(GraffyClient(baseUrl));
    setStore(store);
  }, [baseUrl]);

  return store ? (
    <GraffyProvider store={store}>
      <div className="demo">
        <div className="pane">
          <h5>Query</h5>
          <Query value={query} onChange={setQuery} />
        </div>
        <div className="pane">
          <h5>Result</h5>
          <Result query={query} />
        </div>
      </div>
      <style jsx>{`
        .demo {
          display: flex;
          flex-direction: row;
        }

        .pane {
          display: block;
          margin: 4px;
          min-width: 0;
          min-height: 0;
          padding: 1rem;
          border-radius: 4px;
          color: #777;
          flex: 1 1 0;
          position: relative;
          overflow: hidden;
        }

        .pane + .pane {
          margin-left: none;
        }

        .pane :global(pre) {
          border: none;
          margin: 0;
          padding: 0;
          color: inherit;
          overflow: hidden;
        }

        .pane h5 {
          margin: 0 0 0.5rem 0;
          color: inherit;
          white-space: nowrap;
        }

        @media screen and (max-width: 68rem) {
          .demo {
            flex-direction: column;
            width: 100%;
            height: 80vh;
          }

          .pane + .pane {
            margin-top: 0;
            margin-left: 4px;
          }
        }
      `}</style>
    </GraffyProvider>
  ) : null;
}
