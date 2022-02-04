type Query = QueryObject | QueryKeyed | QueryArray | true | 1;
type QueryObject = { $ref: any[] } | { [k: string]: Query };
type QueryKeyed = { $key: any } & ({ $key: any } | QueryObject);
type QueryArray = QueryKeyed[];

// const q: Query = [{ $key: 44, foo: true }];

type PagedResult<T> = T[] & { $page: any, $prev: any, $next: any };
type BranchResult<T> = { [K in keyof T]: null | Result<T[K]> } & { $ref: any[] };

type Result<T> =
    T extends QueryObject ? BranchResult<T> :
    T extends QueryKeyed ? PagedResult<BranchResult<T>> :
    T extends QueryArray ? (Result<T[number]>)[] :
    any;

// function read<Q extends Query> (input: Q) : Result<Q> {
//     // @ts-ignore
//     return input;
// }


// const zz = read({ foo: [{ $key: {foo: 1}, bar: true }] });
// zz?.foo?.[0].bar;

