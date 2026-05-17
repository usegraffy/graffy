import PropTypes from 'prop-types';
import { createContext, createElement } from 'react';

export const GraffyContext = createContext(null);

export function GraffyProvider({ store, children }) {
  return createElement(GraffyContext.Provider, { value: store }, children);
}
GraffyProvider.propTypes = {
  store: PropTypes.object.isRequired,
  children: PropTypes.node,
};
