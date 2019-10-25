import React from 'react';
import getNavProps from './getNavProps';

// const { menu } = getNavProps();

function Navigation({ menu }) {
  return (
    <ul>
      {menu.map(({ title, url, children }) => (
        <li key={url}>
          {title && <a href={url}>{title}</a>}
          {children && <Navigation menu={children} />}
        </li>
      ))}
      <style jsx>{`
        text-decoration: none;
        list-style-type: none;
        ul {
          padding: 0 0 0 1rem;
          margin: 0;
        }
      `}</style>
    </ul>
  );
}

Navigation.getInitialProps = getNavProps;

export default Navigation;
