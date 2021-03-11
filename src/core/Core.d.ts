export default class Core {
  handlers: {};
  on(type: any, path: any, handle: any): void;
  call(type: any, payload: any, options?: {}): any;
}
