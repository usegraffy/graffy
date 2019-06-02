import React from 'react';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext';

const { useRef, useState, useEffect, useContext } = React;

const consumeSubscription = async (sub, setValue, setLoading) => {
  try {
    for await (const val of sub) {
      setValue(val);
      setLoading(false);
    }
  } catch (e) {
    console.log('Error reading stream in useGraffy', e);
  }
};

export default function useGraffy(query) {
  const queryRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(null);
  const store = useContext(GraffyContext);

  const queryHasChanged = !isEqual(queryRef.current, query);
  if (queryHasChanged) queryRef.current = query;

  useEffect(() => {
    if (!loading) setLoading(true);
    const subscription = store.sub(query);
    consumeSubscription(subscription, setValue, setLoading);

    return () => {
      subscription.return();
    };
  }, [queryHasChanged ? query : queryRef.current]);

  return [loading || queryHasChanged, value, store.put];
}
