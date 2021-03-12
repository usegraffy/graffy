export function shiftFn(fn: any, path: any): (payload: any, options: any, next: any) => Promise<any[]>;
export function shiftGen(fn: any, path: any): (payload: any, options: any, next: any) => AsyncGenerator<any, void, any>;
