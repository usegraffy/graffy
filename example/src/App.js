import React, { Component } from 'react';
import Grue from 'grue/core';
import mock from './mockVisitorList';
// import Cache from 'grue/cache';

import './App.css';

const g = new Grue();
g.use(mock);
// g.use(new Cache());

class App extends Component {
  state = {}

  handleClick = () => {
    const id = `p${Date.now()}`;
    g.put(['pokes', id], true);
  }

  async componentDidMount() {
    for await (let value of g.sub(
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
