import React, {
  // Component,
  createContext,
  useRef,
  useState,
  useEffect,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';

const GraffyContext = createContext();

export function GraffyProvider({ store, children }) {
  return (
    <GraffyContext.Provider value={store}>{children}</GraffyContext.Provider>
  );
}
GraffyProvider.propTypes = {
  store: PropTypes.object.isRequired,
  children: PropTypes.node,
};

// export class GraffyConsumer extends Component {
//   static contextType = GraffyContext;
//
//   state = { value: null, subscription: null };
//
//   render() {
//     return this.props.children();
//   }
// }

const consumeSubscription = async (sub, setValue, setLoading) => {
  for await (const val of sub) {
    setValue(val);
    setLoading(false);
  }
};

export function useGraffy(query) {
  const queryRef = useRef(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(null);
  const store = useContext(GraffyContext);

  const queryHasChanged = !isEqual(queryRef.current, query);

  useEffect(() => {
    if (!queryHasChanged) return;
    queryRef.current = query;

    console.log('Effect called, resubscribing');

    if (!loading) setLoading(true);
    if (subscription) subscription.return();
    const newSubscription = store.sub(query, { values: true });
    consumeSubscription(newSubscription, setValue, setLoading);
    setSubscription(newSubscription);

    return () => {
      console.log('Effect cleanup called');
    };
  });

  console.log('Loading is', loading, queryHasChanged);

  return [loading || queryHasChanged, value, store.put];
}
