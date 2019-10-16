import React, { useState } from 'react';
import PropTypes from 'prop-types';
// import { keyBefore, keyAfter, query, decorate } from '@graffy/common';
// import { useGraffy } from '@graffy/react';

function Link({ slide, selection, setSelection, children }) {
  console.log(slide, selection, setSelection, children);
  return (
    <a
      onClick={() => setSelection(slide)}
      className={slide === selection ? 'Link--selected' : ''}
    >
      {children}
    </a>
  );
}

function Slide({ slide, selection, children }) {
  return (
    <div className={slide === selection ? 'Slide Slide--selected' : 'Slide'}>
      {children}
    </div>
  );
}

export default function App() {
  const slides = ['connect', 'data', 'make', 'query', 'live', 'results'];
  const [selection, setSelection] = useState('data');
  const [slideshow, setSlideshow] = useState(true);

  const linkProps = { selection, setSelection };
  const slideProps = { selection };

  return (
    <div className="App">
      <ul className="Links">
        <li>
          <Link slide="connect" {...linkProps}>
            Connect
          </Link>{' '}
          your{' '}
          <Link slide="data" {...linkProps}>
            data
          </Link>
        </li>
        <li>
          <Link slide="make" {...linkProps}>
            Make
          </Link>{' '}
          your{' '}
          <Link slide="query" {...linkProps}>
            query
          </Link>
        </li>
        <li>
          Get{' '}
          <Link slide="live" {...linkProps}>
            live
          </Link>{' '}
          <Link slide="results" {...linkProps}>
            results
          </Link>
        </li>
      </ul>
      <div className="Slides">
        <Slide slide="connect" {...slideProps}>
          <pre>{`
          store.use('/players', GraffyPostgres({
            table: 'players'
          }));
        `}</pre>
        </Slide>
        <Slide slide="data" {...slideProps}>
          <pre>{`
          // TODO: Interactive tree goes here.
        `}</pre>
        </Slide>
        <Slide slide="make" {...slideProps}>
          <pre>{`
          const results = store.watch(query);
        `}</pre>
        </Slide>
        <Slide slide="query" {...slideProps}>
          <pre>{`
          results = store.watch({
            players: [
              { first: 2 },
              {
                name: true,
                avatar: true
              }
            ]
          });
        `}</pre>
        </Slide>
        <Slide slide="live" {...slideProps}>
          <pre>{`
          for await (result of results)
        `}</pre>
        </Slide>
        <Slide slide="results" {...slideProps}>
          <pre>{`
          {
            players: [
              {
                name: 'Luke',
                avatar: 'luke.png'
              },
              {
                name: 'Leia',
                avatar: 'leia.png'
              }
            ]
          }
        `}</pre>
        </Slide>
      </div>
    </div>
  );
}
