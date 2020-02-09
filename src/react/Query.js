import useQuery from './useQuery';

export default function Query({ query, once, children }) {
  const [result, loading, error] = useQuery(query, { once });
  return children({ result, loading, error });
}
