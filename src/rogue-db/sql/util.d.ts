export function getArgSql({
  first,
  last,
  after,
  before,
  since,
  until,
  order,
  cursor: _,
  id,
  ...filter
}: {
  [x: string]: any;
  first: any;
  last: any;
  after: any;
  before: any;
  since: any;
  until: any;
  order: any;
  cursor: any;
  id: any;
}): {
  key: any;
  where: any[];
  order: any;
  limit: any;
};
export function getSelectCols(_options: any): any;
export function getInsertCols(_options: any): any;
export function getUpdateSet(object: any, options: any): any;
export function getInsertVals(object: any, options: any): any;
export function concatSql(frags: any, delim: any): any;
