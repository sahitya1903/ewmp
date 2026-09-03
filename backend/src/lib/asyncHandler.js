// Express 4 does not forward rejected promises from async route handlers to the
// error middleware — an unhandled rejection there can crash the process. Wrap
// every async handler so a thrown error becomes a normal `next(err)` instead.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
