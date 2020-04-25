import React, { useState } from 'react';
import { keyBefore, keyAfter } from '@graffy/common';
import { useQuery } from '@graffy/react';

import VisitorList from './VisitorList';
import Pagination from './Pagination';
import Spinner from './Spinner';
import Query from './Query';

const PAGE_SIZE = 30;

function getQuery(range) {
  return {
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
  };
}

export default function App() {
  const [range, setRange] = useState({ first: PAGE_SIZE });
  const q = getQuery(range);
  const [data, loading] = useQuery(q);

  if (!data || !data.visitorsByTime) {
    // We are still performing the initial load
    return <Spinner />;
  }

  // Extract page info, this is used in several places
  const { start, end, hasNext, hasPrev } = data.visitorsByTime.pageInfo;

  const visitors = data.visitorsByTime;

  if (!loading && !hasPrev && hasNext && range.last) {
    // We have reached the beginning of the list while paginating backwards.
    // Flip the query to the first 30.
    setRange({ first: PAGE_SIZE });
    return <Spinner />;
  }

  return (
    <div className="App">
      <Query
        query={q}
        onChange={(value) => {
          console.log(value);
        }}
      />
      <Pagination
        onPrev={
          hasPrev &&
          (() => setRange({ last: PAGE_SIZE, before: keyBefore(start) }))
        }
        range={range}
        count={visitors.length}
        onNext={
          hasNext &&
          (() => setRange({ first: PAGE_SIZE, after: keyAfter(end) }))
        }
      />
      <VisitorList visitors={visitors} />
      {loading && <Spinner />}
    </div>
  );
}
