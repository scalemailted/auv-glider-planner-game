export class CodecError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CodecError';
    this.code = code;
    this.details = details;
  }
}

export function codecFailure(code, message, path = '$', details = {}) {
  return Object.freeze({ code, message, path, ...details });
}

export function codecWarning(code, message, path = '$', details = {}) {
  return Object.freeze({ code, message, path, ...details });
}