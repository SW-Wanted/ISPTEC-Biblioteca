// Tipos auxiliares para APIs
export type ErrorResponse = {
  error: string;
  details?: string;
};

export type SuccessResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type ApiError = Error & {
  statusCode?: number;
  details?: unknown;
};

export type PrismaError = Error & {
  code?: string;
  meta?: Record<string, unknown>;
};

export type RequestBody = Record<string, unknown>;

export type QueryParams = Record<string, string | string[] | undefined>;
