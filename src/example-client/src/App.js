import React, { Component } from 'react';
import Grue from '@grue/core';
import Client from '@grue/client';
// import mock from './mockVisitorList';
// import Cache from 'grue/cache';

import './App.css';

const store = new Grue();
// store.use(new Cache());
store.use(Client('https://localhost:8443'));

class App extends Component {
  state = {}

  handleClick = () => {
    const id = `p${Date.now()}`;
    store.put(['pokes', id], true);
  }

  async componentDidMount() {
    for await (let value of store.sub(
      { visitorsByTime: { '**3': { id: true, ts: true } } },
      { values: true }
    )) {
      // console.log('Received', value);
      this.setState(value);
    }
  }

  render() {
    return (
      <div className="App">
        <pre>{JSON.stringify(this.state, null, 2)}</pre>
      </div>
    );
  }
}

export default App;
