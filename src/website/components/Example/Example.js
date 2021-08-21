import React, { useState } from 'react';
import { useQuery } from '@graffy/react';

import VisitorList from './VisitorList.js';
import Pagination from './Pagination.js';
import Spinner from './Spinner.js';
// import Query from './Query.js';

const PAGE_SIZE = 12;

function getQuery(range) {
  return {
    visitors: {
      $key: { $order: ['ts'], ...range },
      id: true,
      ts: true,
      name: true,
      avatar: true,
      pageviews: { $key: { $last: 3 } },
    },
  };
}

export default function Example() {
  const [range, setRange] = useState({ $first: PAGE_SIZE });
  const q = getQuery(range);
  const { data, loading } = useQuery(q);

  if (loading || !data || !data.visitors) {
    // We are still performing the initial load
    return <Spinner />;
  }

  // Extract page info, this is used in several places
  let { $next, $prev } = data.visitors;

  const visitors = data.visitors;

  if (!loading && !$prev && $next && range.$last) {
    // We have reached the beginning of the list while paginating backwards.
    // Flip the query to the first N.
    setRange({ $first: PAGE_SIZE });
    return <Spinner />;
  }

  return (
    <div className="Example">
      <Pagination
        range={range}
        count={visitors.length}
        onPrev={$prev && (() => setRange($prev))}
        onNext={$next && (() => setRange($next))}
      />
      <VisitorList visitors={visitors} />
      <style jsx>{`
        .Example {
          text-align: left;
          width: 100%;
          line-height: 1em;
        }
      `}</style>
    </div>
  );
}
