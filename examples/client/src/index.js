import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Graffy, { encRange, getPage } from '@graffy/core';
import Client from '@graffy/client';

import Visitor from './Visitor';
import './index.css';

const store = new Graffy();
store.use(Client('http://localhost:8443'));

class App extends Component {
  state = { range: { last: 30 } };

  prev = () => {
    const { start, hasPrev } = getPage(this.state.visitorsByTime);
    if (!hasPrev) return;
    this.setState({ range: { last: 31, before: start } });
  };

  next = () => {
    const { end, hasNext } = getPage(this.state.visitorsByTime);
    if (!hasNext) return;
    this.setState({ range: { first: 31, after: end } });
  };

  async subscribe() {
    const { range } = this.state;
    const rangeKey = encRange(range);
    if (this.subscribedKey && this.subscribedKey === rangeKey) return;

    if (this.subscription) this.subscription.return();

    this.subscribedKey = rangeKey;
    this.subscription = store.sub(
      {
        visitorsByTime: {
          [rangeKey]: {
            id: true,
            ts: true,
            name: true,
            avatar: true,
            pageviews: { '**3': true },
          },
        },
      },
      { values: true },
    );

    for await (let value of this.subscription) {
      const { hasNext, hasPrev } = getPage(value.visitorsByTime);
      if (
        (!hasNext || !hasPrev) &&
        (typeof range.before !== 'undefined' ||
          typeof range.after !== 'undefined')
      ) {
        // We have reached the beginning or end of the list while paginating in
        // the wrong direction; just flip the query to first or last 30.
        this.setState({ range: { [range.first ? 'last' : 'first']: 30 } });
      } else {
        this.setState(value);
      }
    }
  }

  componentDidMount() {
    this.subscribe();
  }

  componentDidUpdate() {
    this.subscribe();
  }

  render() {
    const {
      visitorsByTime = {},
      range: { after, before },
    } = this.state;
    const { hasNext, hasPrev } = getPage(visitorsByTime);

    return (
      <div className="App">
        <div className="Pagination">
          <button onClick={this.prev} disabled={!hasPrev}>
            &lt;
          </button>
          <button onClick={this.next} disabled={!hasNext}>
            &gt;
          </button>
        </div>
        <div className="List">
          {Object.keys(visitorsByTime)
            .sort()
            .filter(
              (_, i) =>
                !(
                  (i === 0 && typeof after !== 'undefined') ||
                  (i === 30 && typeof before !== 'undefined')
                ),
            )
            .map(ts => (
              <Visitor key={visitorsByTime[ts].id} {...visitorsByTime[ts]} />
            ))}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById('root'));
