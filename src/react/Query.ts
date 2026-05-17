import useQuery from './useQuery.ts';

export default function Query({ query, options, children }) {
  const result = useQuery(query, options) as any;
  const { data, loading, error } = result;
  return children({ data, loading, error });
}
