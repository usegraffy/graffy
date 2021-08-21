import React from 'react';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext.jsx';

const { useRef, useState, useEffect, useContext } = React;

const consumeSubscription = async (subscription, setState) => {
  try {
    for await (const data of subscription) {
      if (subscription.closed) {
        // console.warn('Ignoring update after subscription has closed.');
        break;
      }

      setState((prevState) => ({
        ...prevState,
        loading: false,
        data,
        error: null,
      }));
    }
  } catch (error) {
    // console.error('Error reading stream in useQuery', e);
    setState((prevState) => ({
      ...prevState,
      loading: false,
      data: null,
      error,
    }));
  }
};

const retrieveResult = async (promise, setState) => {
  try {
    const data = await promise;
    setState((prevState) => ({
      ...prevState,
      loading: false,
      data,
      error: null,
    }));
  } catch (error) {
    // console.error('Error fetching result in useQuery', e);
    setState((prevState) => ({
      ...prevState,
      loading: false,
      data: null,
      error,
    }));
  }
};

export default function useQuery(query, { once, ...other } = {}) {
  const store = useContext(GraffyContext);
  const queryRef = useRef(null);

  const queryHasChanged = !isEqual(queryRef.current, query);
  if (queryHasChanged) {
    queryRef.current = query;
  }

  const fetchData = (options = other) => {
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
  };

  const refetch = fetchData.bind(null, { ...other, skipCache: true });
  const [state, setState] = useState({ loading: true });

  useEffect(fetchData, [queryRef.current, store]);

  return once ? { ...state, refetch } : state;
}
