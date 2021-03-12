export default function makeStream(
  init: any,
  options?: {},
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
