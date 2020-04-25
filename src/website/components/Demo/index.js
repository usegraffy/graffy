import React, { useState } from 'react';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import { GraffyProvider } from '@graffy/react';

import Source, { provider } from './Source';
import Query from './Query';
import Result from './Result';

const store = new Graffy();
store.use(GraffyFill());
store.use(provider);

export default function Demo() {
  const [query, setQuery] = useState({
    players: [{ first: 2 }, { name: true, score: true }],
  });

  const [expanded, setExpanded] = useState('result');
  const paneProps = (name) => ({
    ...(expanded === name ? { 'data-expanded': 'true' } : {}),
    tabIndex: 0,
    onFocus: () => setExpanded(name),
    onBlur: () => setExpanded('result'),
  });

  return (
    <GraffyProvider store={store}>
      <div className="demo">
        <div className="pane" {...paneProps('source')}>
          <h5>
            <a>Source Data</a>
          </h5>
          <Source />
        </div>
        <div className="pane" {...paneProps('query')}>
          <h5>
            <a>Graffy Query</a>
          </h5>
          <Query value={query} onChange={setQuery} />
        </div>
        <div className="pane" {...paneProps('result')}>
          <h5>Live Results</h5>
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
          transition: 0.2s all ease-in-out 0.05s;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        .pane::after {
          content: ' ';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: 0;
          box-shadow: 0 0 16px 16px #fff;
        }

        .pane + .pane {
          margin-left: none;
        }

        .pane[data-expanded] {
          outline: none;
          background: #fff;
          box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.33);
          z-index: 1;
          color: #555;
          flex: 4 4 0;
          min-width: 50%;
          max-width: 80%;
          cursor: auto;
          overflow: auto;
        }
        .pane[data-expanded]::after {
          display: none;
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

        .pane:hover a {
          background-color: #f36;
          box-shadow: -4px 0 0 0 #f36, 4px 0 0 0 #f36;
          color: #fff;
          text-decoration: none;
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

          .pane[data-expanded] {
            min-width: auto;
            max-width: none;
            min-height: 50%;
            max-height: 80%;
          }

          .pane::after {
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: auto;
            height: 0;
          }
        }
      `}</style>
    </GraffyProvider>
  );
}
