export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
    retry_after: number | null;
  };
}

export function createApiError(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  retryAfter: number | null = null,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      retry_after: retryAfter,
    },
  };
}
