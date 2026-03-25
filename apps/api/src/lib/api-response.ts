import type { Response } from "express";

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export function sendSuccess<T>(response: Response, data: T, statusCode = 200) {
  return response.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
) {
  return response.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}

