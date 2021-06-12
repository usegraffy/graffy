import gqlTag from 'graphql-tag';
import toQuery from './toQuery.js';

export default function gql(...args) {
  return toQuery(gqlTag(...args));
}
