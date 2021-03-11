export default function subscribe(
  store: any,
  originalQuery: any,
  {
    raw,
  }: {
    raw: any;
  },
): {
  debugId: any;
  next: () => any;
  return(
    value: any,
  ): Promise<{
    value: any;
    done: boolean;
  }>;
  throw(error: any): Promise<never>;
  [Symbol.asyncIterator](): any;
};
