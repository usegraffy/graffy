// Paths and keys
/** @typedef {string|Record<string,any>} Key */
/** @typedef {PathArray | string} Path */
/** @typedef {Key[]} PathArray */

// Options
/** @typedef {Record<string, any>} Options */

// Queries
/** @typedef {QueryObject | QueryKeyed | QueryArray | true | 1} Query */
/** @typedef {{ $ref: any[] } | { [k: string]: Query }} QueryObject */
/** @typedef {{ $key: any } & ({ $key: any } | QueryObject)} QueryKeyed */
/** @typedef {QueryKeyed[]} QueryArray */

// Results
/**
 * @template T
 * @typedef {T[] & { $page: any, $prev: any, $next: any }} PagedResult<T>
 */

/**
 * @template T
 * @typedef {{ [K in keyof T]: null | Result<T[K]> } & { $ref: any[] }} BranchResult<T>
 */

/**
 * @template T
 * @typedef { T extends QueryObject ? BranchResult<T> :
 *            T extends QueryKeyed ? PagedResult<BranchResult<T>> :
 *            T extends QueryArray ? (Result<T[number]>)[] :
 *            any } Result<T>
 */

// This is necessary for TypeScript to treat this file as a module.
export default null;
