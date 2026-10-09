export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "RATE_LIMITED"
  | "POLICY_REJECTED"
  | "NETWORK"
  | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;
  readonly retryable: boolean;
  readonly requestId: string;

  constructor(code: ApiErrorCode, message: string, opts?: { status?: number; details?: Record<string, string>; retryable?: boolean; requestId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = opts?.status ?? 500;
    this.details = opts?.details;
    this.retryable = opts?.retryable ?? (code === "UPSTREAM_TIMEOUT" || code === "UPSTREAM_UNAVAILABLE" || code === "NETWORK" || code === "RATE_LIMITED");
    this.requestId = opts?.requestId ?? "req_" + Math.random().toString(36).slice(2, 10);
  }
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong. Try again.";
}
