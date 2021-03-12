export default class Graffy {
    constructor(path?: any[], core?: Core);
    core: Core;
    path: any[];
    on(type: any, ...args: any[]): void;
    onRead(...args: any[]): void;
    onWatch(...args: any[]): void;
    onWrite(...args: any[]): void;
    use(...args: any[]): void;
    call(type: any, payload: any, options?: {}): any;
    read(...args: any[]): Promise<any>;
    watch(...args: any[]): {
        debugId: any;
        next: () => any;
        return(value: any): Promise<{
            value: any;
            done: boolean;
        }>;
        throw(error: any): Promise<never>;
        [Symbol.asyncIterator](): any;
    };
    write(...args: any[]): Promise<any>;
}
import Core from "./Core";
