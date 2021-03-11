export default function makeWatcher(): {
  write: (change: any) => void;
  watch: (
    ...args: any[]
  ) => {
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
};
