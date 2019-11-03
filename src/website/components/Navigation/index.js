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
          padding: 0;
          margin: 0;
          font-weight: bold;
          line-height: 2rem;
        }
        ul ul {
          font-weight: normal;
          text-indent: 1rem;
        }
        a {
          display: block;
          margin: 0 -4rem;
          padding: 0 4rem;
          box-shadow: none;
        }
      `}</style>
    </ul>
  );
}

export default Navigation;
