import React from 'react';
import getNavProps from './getNavProps';

function Navigation({ menu }) {
  return <pre>{JSON.stringify(menu, null, 2)}</pre>;
}

Navigation.getInitialProps = getNavProps;

export default Navigation;
