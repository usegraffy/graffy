import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime';

export default function Visitor({ avatar, name, ts, pageviews }) {
  const timeString = getTime(ts);
  return (
    <div className="Visitor">
      <img className="Visitor-avatar" src={avatar} alt={name} />
      <div className="Visitor-meta">
        <div className="Visitor-name">{name}</div>
        <div className="Visitor-ts">{timeString}</div>
      </div>
      <div className="Visitor-pages">
        {pageviews.map((url, i) => (
          <div key={i} className="Visitor-page">
            {url}
          </div>
        ))}
      </div>
      <style jsx>{`
        .Visitor {
          display: flex;
          padding: 4px;
          background: #eee;
          color: #666;
          border-radius: 5em;
          cursor: pointer;
        }

        .Visitor--muted {
          opacity: 0.25;
        }

        .Visitor:hover:not(:disabled) {
          background: #fff;
          box-shadow: inset 0 0 16px 8px #eee;
        }

        .Visitor-avatar {
          flex: 0 0 auto;
          width: 3em;
          height: 3em;
          background-color: #eee;
          overflow: hidden;
          border-radius: 100%;
        }

        .Visitor-meta {
          flex: 1 1 0;
          margin: 0 1em;
        }

        .Visitor-name {
          color: #333;
          font-size: 1.5em;
          line-height: 1.333em;
        }

        .Visitor-ts {
        }

        .Visitor-pages {
          flex: 1 1 0;
        }

        .Visitor-page {
          position: relative;
          padding-left: 1em;
        }

        .Visitor-page::before {
          content: '';
          position: absolute;
          border: 2px solid #999;
          height: 0.25em;
          width: 0.25em;
          border-radius: 100%;
          left: 0;
          top: 0.375em;
        }

        .Visitor-page:last-child::before {
          background: #999;
        }

        .Visitor-page + .Visitor-page::after {
          content: '';
          position: absolute;
          border-left: 2px solid #999;
          height: 0.75em;
          width: 1px;
          left: 0.25em;
          margin-left: -1px;
          bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}

Visitor.propTypes = {
  avatar: PropTypes.string,
  name: PropTypes.string,
  ts: PropTypes.number,
  pageviews: PropTypes.array,
  muted: PropTypes.bool,
};
