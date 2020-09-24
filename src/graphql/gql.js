import gqlTag from 'graphql-tag';
import toQuery from './toQuery';

export default function gql(...args) {
  return toQuery(gqlTag(...args));
}
