import { Writable } from 'stream';

// Minimal stub for tar module used in tests.
// Provides x/extract and c/create methods returning writable streams
// that immediately consume data without touching the real filesystem.
export const x = (_opts?: any) => new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  }
});

export const c = (_opts?: any, _files?: string[]) => new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  }
});

export const extract = x;
export const create = c;
export default { x, c, extract, create };
