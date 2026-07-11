export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly safeMessage: string;

  constructor(code: string, status: number, safeMessage: string, options?: ErrorOptions) {
    super(safeMessage, options);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.safeMessage = safeMessage;
  }
}
