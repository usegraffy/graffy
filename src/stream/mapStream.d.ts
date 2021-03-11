export default function mapStream(
  stream: any,
  fn: any,
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
