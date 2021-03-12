export default httpClient;
declare function httpClient(
  baseUrl: any,
  {
    getOptions,
    watch,
    connInfoPath,
  }?: {
    getOptions?: () => Promise<void>;
    watch: any;
    connInfoPath?: string;
  },
): (store: any) => void;
