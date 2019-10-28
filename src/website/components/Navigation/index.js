import React from 'react';
import Link from 'next/link';

function Navigation({ menu }) {
  return (
    <ul>
      {menu.map(({ title, url, children }) => (
        <li key={url}>
          {title && (
            <Link href={url}>
              <a>{title}</a>
            </Link>
          )}
          {children && <Navigation menu={children} />}
        </li>
      ))}
      <style jsx>{`
        text-decoration: none;
        list-style-type: none;
        ul {
          padding: 0 0 0 1rem;
          margin: 0;
          font-weight: bold;
        }
        ul ul {
          font-weight: normal;
        }
      `}</style>
    </ul>
  );
}

export default Navigation;
