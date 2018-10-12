import React, { Component } from 'react';
import { Grue } from 'grue/core';
import { Cache } from 'grue/cache';

import './App.css';

const g = new Grue();
g.use(new Cache());

class App extends Component {
  state = { pokes: {} }

  handleClick = () => {
    const id = `p${Date.now()}`;
    g.put(['pokes', id], true);
  }

  async componentDidMount() {
    for await (let value of g.on(['pokes'])) {
      this.setState(value);
    }
  }

  render() {
    return (
      <div className="App">
        <button onClick={this.handleClick}>Send</button>
        <pre>{Object.keys(this.state.pokes).join('\n')}</pre>
      </div>
    );
  }
}

export default App;
