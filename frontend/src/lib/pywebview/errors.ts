export class BridgeNotReadyError extends Error {
  constructor(message = "pywebview API is not ready") {
    super(message);
    this.name = "BridgeNotReadyError";
  }
}

export class NotInDesktopError extends Error {
  constructor(message = "Not running inside pywebview desktop shell") {
    super(message);
    this.name = "NotInDesktopError";
  }
}

export class PythonApiError extends Error {
  readonly stackTrace?: string;

  constructor(message: string, stackTrace?: string) {
    super(message);
    this.name = "PythonApiError";
    this.stackTrace = stackTrace;
  }
}
