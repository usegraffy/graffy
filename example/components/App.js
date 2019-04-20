import React, { useState } from 'react';
import { encRange, getPage } from '@graffy/common';
import { useGraffy } from '@graffy/react';

import VisitorList from './VisitorList';
import Pagination from './Pagination';
import Spinner from './Spinner';

function getQuery(range) {
  return {
    visitorsByTime: {
      [encRange(range)]: {
        id: true,
        ts: true,
        name: true,
        avatar: true,
        pageviews: { [encRange({ last: 3 })]: true },
      },
    },
  };
}

export default function App() {
  const [range, setRange] = useState({ last: 30 });
  const query = getQuery(range);
  const [loading, data] = useGraffy(query);

  console.log(loading, data, query);

  if (!data || !data.visitorsByTime) {
    // We are still loading
    return <Spinner />;
  }

  // Extract page info, this is used in several places
  const { start, end, hasNext, hasPrev } = getPage(data.visitorsByTime);

  const visitors = Object.keys(data.visitorsByTime)
    .sort()
    .map(ts => data.visitorsByTime[ts]);

  const anchor =
    typeof range.after !== 'undefined'
      ? visitors[0].id
      : typeof range.before !== 'undefined'
      ? visitors[visitors.length - 1].id
      : null;

  if (!loading && (!hasNext || !hasPrev) && anchor) {
    console.log('Reached end?', range, hasNext, hasPrev);
    // We have reached the beginning or end of the list while paginating in
    // the wrong direction; just flip the query to the first or last 30.
    setRange({ [range.first ? 'last' : 'first']: 30 });
    return 'Loading...';
  }

  return (
    <div className="App">
      <Pagination
        onPrev={hasPrev && (() => setRange({ last: 31, before: start }))}
        onNext={hasNext && (() => setRange({ first: 31, after: end }))}
      />
      <VisitorList visitors={visitors} anchor={anchor} />
      {loading && <Spinner />}
    </div>
  );
}
