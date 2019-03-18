import React from 'react';
import PropTypes from 'prop-types';

const { createContext } = React;
const GraffyContext = createContext();

export default GraffyContext;
export function GraffyProvider({ store, children }) {
  return (
    <GraffyContext.Provider value={store}>{children}</GraffyContext.Provider>
  );
}
GraffyProvider.propTypes = {
  store: PropTypes.object.isRequired,
  children: PropTypes.node,
};
