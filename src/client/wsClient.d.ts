export default wsClient;
declare function wsClient(
  url: any,
  {
    getOptions,
    watch,
    connInfoPath,
  }?: {
    getOptions?: () => void;
    watch: any;
    connInfoPath?: string;
  },
): (store: any) => void;
