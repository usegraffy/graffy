import useQuery from './useQuery';

export default function Query({ query, options, children }) {
  const [result, loading, error] = useQuery(query, options);
  return children({ result, loading, error });
}
