export default function mockBackend(options?: {}): {
  state: any[];
  read: () => any[];
  watch: () => {
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
  write: (change: any) => any;
};
