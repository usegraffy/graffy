import React from 'react';

export default function Spinner() {
  return (
    <div className="Spinner">
      Loading...
      <style jsx>{`
        .Spinner {
          position: fixed;
          top: 0;
          right: 0;
          left: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2em;
          background: rgba(0, 0, 0, 0.25);
          color: #fff;
          text-shadow: 0 0 8px #000;
        }
      `}</style>
    </div>
  );
}
