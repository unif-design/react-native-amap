export interface CodedError extends Error {
  code: string;
  cause?: unknown;
}
