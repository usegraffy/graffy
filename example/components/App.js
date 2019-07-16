import React, { useState } from 'react';
import { keyBefore, keyAfter } from '@graffy/struct';
import { query, decorate } from '@graffy/decorate';
import { useGraffy } from '@graffy/react';

import VisitorList from './VisitorList';
import Pagination from './Pagination';
import Spinner from './Spinner';

function getQuery(range) {
  return query({
    visitorsByTime: [
      range,
      {
        id: true,
        ts: true,
        name: true,
        avatar: true,
        pageviews: [{ last: 3 }, true],
      },
    ],
  });
}

export default function App() {
  const [range, setRange] = useState({ first: 5 });
  const query = getQuery(range);
  const [loading, result] = useGraffy(query);

  const data = result && decorate(result);

  if (!data || !data.visitorsByTime) {
    // We are still loading
    return <Spinner />;
  }

  // Extract page info, this is used in several places
  const { start, end, hasNext, hasPrev } = data.visitorsByTime.pageInfo;
  // const [start, end, hasNext, hasPrev] = ['', '', true, true];

  const visitors = data.visitorsByTime;

  if (!loading && (!hasNext || !hasPrev)) {
    // We have reached the beginning or end of the list while paginating in
    // the wrong direction; just flip the query to the first or last 30.
    // setRange({ [range.first ? 'last' : 'first']: 30 });
    // return <Spinner />;
  }

  return (
    <div className="App">
      <Pagination
        onPrev={
          hasPrev && (() => setRange({ last: 5, before: keyBefore(start) }))
        }
        count={visitors.length}
        onNext={hasNext && (() => setRange({ first: 5, after: keyAfter(end) }))}
      />
      <VisitorList visitors={visitors} />
      {loading && <Spinner />}
    </div>
  );
}
