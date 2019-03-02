import React, { Component } from 'react';
import Grue, { encRange, getPage } from '@grue/core';
import Client from '@grue/client';
// import Cache from 'grue/cache';

import Visitor from './Visitor';
import './App.css';

const store = new Grue();
// store.use(new Cache());
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
      { visitorsByTime: { [rangeKey]: { id: true, ts: true, name: true } } },
      { values: true },
    );

    for await (let value of this.subscription) {
      this.setState(value);
    }
  }

  componentDidMount() {
    this.subscribe();
  }

  componentDidUpdate() {
    this.subscribe();
  }

  render() {
    const { visitorsByTime = {} } = this.state;
    const { hasNext, hasPrev } = getPage(visitorsByTime);

    console.log(getPage(visitorsByTime));

    return (
      <div className="App">
        <div className="Pagination">
          <button onClick={this.prev} disabled={!hasPrev}>
            Previous
          </button>
          <button onClick={this.next} disabled={!hasNext}>
            Next
          </button>
        </div>
        <div className="List">
          {Object.keys(visitorsByTime).map(ts => (
            <Visitor key={ts} {...visitorsByTime[ts]} />
          ))}
        </div>
      </div>
    );
  }
}

export default App;
