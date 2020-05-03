import React from 'react';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext';

const { useRef, useState, useEffect, useContext } = React;

const consumeSubscription = async (subscription, setState) => {
  try {
    for await (const val of subscription) {
      if (subscription.closed) {
        // console.warn('Ignoring update after subscription has closed.');
        break;
      }

      setState([val, null, null]);
    }
  } catch (e) {
    // console.error('Error reading stream in useQuery', e);
    setState([null, false, e]);
  }
};

const retrieveResult = async (promise, setState) => {
  try {
    setState([await promise, false, null]);
  } catch (e) {
    // console.error('Error fetching result in useQuery', e);
    setState([null, false, e]);
  }
};

export default function useQuery(query, { once, ...options } = {}) {
  const queryRef = useRef(null);

  const [state, setState] = useState([null, true, null]);
  const store = useContext(GraffyContext);

  const queryHasChanged = !isEqual(queryRef.current, query);
  if (queryHasChanged) {
    // console.log('Query changed', debug(queryRef.current), debug(query));
    queryRef.current = query;
  }

  useEffect(() => {
    if (state[1] !== true) setState([state[0], true, state[2]]);
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

  return queryHasChanged ? [state[0], true, state[2]] : state;
}
