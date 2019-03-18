import React from 'react';
import PropTypes from 'prop-types';
import isEqual from 'lodash/isEqual';
import GraffyContext from './GraffyContext';

const { Component } = React;

export default class GraffyConsumer extends Component {
  static contextType = GraffyContext;
  static propTypes = {
    query: PropTypes.object,
    children: PropTypes.func,
  };

  state = { data: null, loading: null };

  async subscribe() {
    const store = this.context;
    const { query } = this.state;

    if (this.subscription) this.subscription.return();
    this.subscription = store.sub(query);
    this.setState({ loading: true });

    for await (const data of this.subscription) {
      this.setState({ data, loading: false });
    }
  }

  componentDidMount() {
    this.subscribe();
  }

  componentDidUpdate(prevProps) {
    if (isEqual(this.props.query, prevProps.query)) return;
    this.subscribe();
  }

  render() {
    return this.props.children(this.state);
  }
}
