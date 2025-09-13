declare module 'tar' {
  export function x(options?: any): any;
  export function c(options?: any, files?: string[]): any;
  export const extract: typeof x;
  export const create: typeof c;
  const _default: {
    x: typeof x;
    c: typeof c;
    extract: typeof x;
    create: typeof c;
  };
  export default _default;
}
