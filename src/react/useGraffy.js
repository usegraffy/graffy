import React from 'react';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext';

const { useRef, useState, useEffect, useContext } = React;

const consumeSubscription = async (sub, setState) => {
  try {
    for await (const val of sub) {
      if (sub.closed) {
        console.warn('Ignoring update after subscription has closed.');
        break;
      }

      setState([val, null]);
    }
  } catch (e) {
    console.log('Error reading stream in useGraffy', e);
  }
};

export default function useGraffy(query) {
  const queryRef = useRef(null);

  const [state, setState] = useState([null, true]);

  // const [loading, setLoading] = useState(true);
  // const [value, setValue] = useState(null);
  const store = useContext(GraffyContext);

  const queryHasChanged = !isEqual(queryRef.current, query);
  if (queryHasChanged) {
    // console.log(
    //   'Query changed from',
    //   debug(queryRef.current),
    //   'to',
    //   debug(query),
    // );
    queryRef.current = query;
  }

  useEffect(() => {
    if (state[1] !== true) setState([state[0], true]);
    const subscription = store.sub(query);
    consumeSubscription(subscription, setState);

    return () => {
      subscription.closed = true;
      subscription.return();
    };
  }, [queryHasChanged ? query : queryRef.current]);

  return queryHasChanged ? [state[0], true] : state;
}
