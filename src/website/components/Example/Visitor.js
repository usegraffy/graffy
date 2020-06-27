import React from 'react';
import PropTypes from 'prop-types';
import getTime from './getTime';

export default function Visitor({ avatar, name, ts, pageviews }) {
  const timeString = getTime(ts);
  return (
    <div className="Visitor">
      <div className="Visitor-meta">
        <img className="Visitor-avatar" src={avatar} alt={name} />
        <div className="Visitor-name">{name}</div>
      </div>
      <div className="Visitor-pages">
        {pageviews.map((url, i) => (
          <div key={i} className="Visitor-page">
            {url}
          </div>
        ))}
      </div>
      <div className="Visitor-ts">{timeString}</div>
      <style jsx>{`
        .Visitor {
          display: flex;
          flex-direction: column;
          padding: 0px;
          border: 0.5em solid #eee;
          background: #eee;
          color: #666;
          border-radius: 2em;
          cursor: pointer;
          overflow: hidden;
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
          border-radius: 100%;
          border: 2px solid #999;
          overflow: hidden;
        }

        .Visitor-meta {
          display: flex;
          align-items: center;
          flex: 1 1 0;
        }

        .Visitor-name {
          color: #333;
          font-size: 1.5em;
          line-height: 1.333em;
          padding: 0 0.5em;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .Visitor-ts {
          text-align: center;
          color: #999;
        }

        .Visitor-pages {
          flex: 1 1 0;
          margin: 0.1em 0 1em 1.5em;
        }

        .Visitor-page {
          position: relative;
          padding-left: 1em;
        }

        .Visitor-page::before {
          content: '';
          position: absolute;
          border: 2px solid #999;
          height: 8px;
          width: 8px;
          border-radius: 100%;
          left: -5px;
          bottom: 0.1em;
        }

        .Visitor-page:last-child::before {
          background: #999;
        }

        .Visitor-page::after {
          content: '';
          position: absolute;
          border-left: 2px solid #999;
          width: 1px;
          left: 0;
          top: -0.1em;
          bottom: 12px;
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
