import type { Response } from "express";

export interface ApiErrorDetails {
  field?: string;
  issue: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetails[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

export function sendSuccess<T>(response: Response, data: T, statusCode = 200) {
  return response.status(statusCode).json({
    success: true,
    data,
  } satisfies ApiSuccessResponse<T>);
}

export function sendError(response: Response, error: ApiErrorPayload, statusCode: number) {
  return response.status(statusCode).json({
    success: false,
    error,
  } satisfies ApiErrorResponse);
}
