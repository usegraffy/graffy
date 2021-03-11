export default function slice(graph: any, query: any, root: any): Result;
export function sliceRange(graph: any, query: any, result: any): void;
declare class Result {
  constructor(root: any);
  root: any;
  addKnown(node: any): void;
  known: any;
  addUnknown(node: any): void;
  unknown: any;
  addLinked(children: any): any;
  linked: any;
}
export {};
