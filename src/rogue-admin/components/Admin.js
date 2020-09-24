import React, { useCallback } from 'react';
import GraphiQL from 'graphiql';
import { useStore } from '@graffy/react';
import { toQuery } from '@graffy/graphql';

export default function Admin({ setTenantId, defaultTenantId }) {
  const store = useStore();

  const fetch = useCallback(async function ({
    query: gqlQuery,
    variables,
    operationName: _,
  }) {
    const query = toQuery(gqlQuery, variables);
    return store.read(query, {});
  });

  const updateTenantId = useCallback((event) => {
    setTenantId(event.target.value);
  });

  return (
    <div className="Admin">
      <style jsx>{`
        div.Admin {
          position: fixed;
          z-index: 99999;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }
      `}</style>
      <div className="Auth">
        <input onChange={updateTenantId} defaultValue={defaultTenantId} />
      </div>
      <GraphiQL fetcher={fetch} />
    </div>
  );
}
