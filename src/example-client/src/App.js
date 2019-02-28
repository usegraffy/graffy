import React, { Component } from 'react';
import Grue from '@grue/core';
import Client from '@grue/client';
// import Cache from 'grue/cache';

import Visitor from './Visitor';
import './App.css';

const store = new Grue();
// store.use(new Cache());
store.use(Client('http://localhost:8443'));

class App extends Component {
  state = { range: { last: 30 } };

  async componentDidMount() {
    for await (let value of store.sub(
      { visitorsByTime: { '**30': { id: true, ts: true, name: true } } },
      { values: true }
    )) {
      this.setState(value);
    }
  }

  render() {
    const { visitorsByTime = {} } = this.state;
    return (
      <div className="App">
        {Object.keys(visitorsByTime).map(ts => <Visitor key={ts} {...visitorsByTime[ts]} />)}
      </div>
    );
  }
}

export default App;
