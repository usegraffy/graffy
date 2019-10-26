import React, { useState } from 'react';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import { page } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import { GraffyProvider } from '@graffy/react';

import Source from './Source';
import Query from './Query';
import Result from './Result';

const store = new Graffy();
store.use(GraffyFill());
store.use(mockBackend().middleware);
store.write({
  players: page({
    leia: { name: 'Leia', avatar: 'leia.png' },
    luke: { name: 'Luke', avatar: 'luke.png' },
  }),
});

export default function Demo() {
  const [query, setQuery] = useState({
    players: [{ first: 2 }, { name: true, avatar: true }],
  });

  return (
    <GraffyProvider store={store}>
      <div className="demo">
        <div className="pane" tabIndex={0}>
          <h3>Data</h3>
          <Source />
        </div>
        <div className="pane">
          <h3>Query</h3>
          <Query value={query} onChange={setQuery} />
        </div>
        <div className="pane" tabIndex={0}>
          <h3>Result</h3>
          <Result query={query} />
        </div>
      </div>
      <style jsx>{`
        .demo {
          display: flex;
          flex-direction: row;
        }

        .pane {
          margin: 4px;
          min-width: 2rem;
          min-height: 2rem;
          padding: 16px;
          text-align: start;
          -webkit-margin-collapse: collapse;
          border-radius: 4px;
          background-color: #eee;
          flex: 1 1 0;
          transition: 0.2s all ease-in;
          overflow: hidden;
        }

        .pane + .pane {
          margin-left: none;
        }

        .pane:focus,
        .pane:focus-within {
          outline: none;
          background: #fff;
          box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.33);
          z-index: 1;
          min-width: 20rem;
          min-height: 20rem;
          transition: 0.2s all ease-out;
        }

        @media screen and (max-aspect-ratio: 1/1) {
          .demo {
            flex-direction: column;
          }

          .pane + .pane {
            margin-top: 0;
            margin-left: 4px;
          }
        }
      `}</style>
    </GraffyProvider>
  );
}
