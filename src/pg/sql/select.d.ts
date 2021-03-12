export function selectByArgs(
  args: any,
  options: any,
  {
    forUpdate,
  }?: {
    forUpdate: any;
  },
): any;
export function selectByIds(
  ids: any,
  options: any,
  {
    forUpdate,
  }?: {
    forUpdate: any;
  },
): any;
export function selectUpdatedSince(version: any, options: any): any;
export function readSql(sqlQuery: any, client: any): Promise<any>;
