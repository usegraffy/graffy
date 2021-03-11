export default function Socket(
  url: any,
  {
    onUnhandled,
    onStatusChange,
  }?: {
    onUnhandled: any;
    onStatusChange: any;
  },
): {
  start: (params: any, callback: any) => string;
  stop: (id: any, params: any) => void;
  isAlive: () => boolean;
};
