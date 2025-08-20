import { Response } from 'express';

export interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    skip?: number;
    take?: number;
    page?: number;
    totalPages?: number;
  };
  errors?: any[];
}

export const sendResponse = <T>(res: Response, payload: ApiResponse<T>): void => {
  const response: ApiResponse<T> = {
    statusCode: payload.statusCode,
    success: payload.success,
    message: payload.message,
  };

  if (payload.data !== undefined) {
    response.data = payload.data;
  }

  if (payload.meta) {
    response.meta = payload.meta;
  }

  if (payload.errors) {
    response.errors = payload.errors;
  }

  res.status(payload.statusCode).json(response);
};