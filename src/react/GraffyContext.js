import React from 'react';
import PropTypes from 'prop-types';
import Graffy from '@graffy/core';

const { createContext } = React;
const GraffyContext = createContext();

export default GraffyContext;
/** @type {(params: {store: Graffy, children: JSX.Element}) => JSX.Element} */
export function GraffyProvider({ store, children }) {
  return (
    <GraffyContext.Provider value={store}>{children}</GraffyContext.Provider>
  );
}
GraffyProvider.propTypes = {
  store: PropTypes.object.isRequired,
  children: PropTypes.node,
};
