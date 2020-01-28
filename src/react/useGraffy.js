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
    // eslint-disable-next-line no-console
    console.error('Error reading stream in useGraffy', e);
    setState([null, false, e]);
  }
};

const retrieveResult = async (promise, setState) => {
  try {
    setState([await promise, false, null]);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error fetching result in useGraffy', e);
    setState([null, false, e]);
  }
};

export default function useGraffy(query, { once } = {}) {
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
      retrieveResult(store.read(query), setState);
    } else {
      const subscription = store.watch(query);
      consumeSubscription(subscription, setState);

      return () => {
        subscription.closed = true;
        subscription.return();
      };
    }
  }, [queryHasChanged ? query : queryRef.current]);

  return queryHasChanged ? [state[0], true, state[2]] : state;
}
