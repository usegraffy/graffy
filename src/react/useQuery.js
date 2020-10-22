import React from 'react';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext';

const { useRef, useState, useEffect, useContext } = React;

const consumeSubscription = async (subscription, setState) => {
  try {
    for await (const data of subscription) {
      if (subscription.closed) {
        // console.warn('Ignoring update after subscription has closed.');
        break;
      }

      setState({ loading: false, data });
    }
  } catch (error) {
    // console.error('Error reading stream in useQuery', e);
    setState({ loading: false, error });
  }
};

const retrieveResult = async (promise, setState) => {
  try {
    const data = await promise;
    setState({ loading: false, data });
  } catch (error) {
    // console.error('Error fetching result in useQuery', e);
    setState({ loading: false, error });
  }
};

export default function useQuery(query, { once, ...options } = {}) {
  const queryRef = useRef(null);

  const [state, setState] = useState({});
  const store = useContext(GraffyContext);

  const queryHasChanged = !isEqual(queryRef.current, query);
  if (queryHasChanged) {
    // console.log('Query changed', debug(queryRef.current), debug(query));
    queryRef.current = query;
  }

  useEffect(() => {
    if (state.loading !== true) setState({ ...state, loading: true });
    if (once) {
      retrieveResult(store.read(query, options), setState);
    } else {
      const subscription = store.watch(query, options);
      consumeSubscription(subscription, setState);

      return () => {
        subscription.closed = true;
        subscription.return();
      };
    }
  }, [queryHasChanged ? query : queryRef.current]);

  return queryHasChanged ? { ...state, loading: true } : state;
}
