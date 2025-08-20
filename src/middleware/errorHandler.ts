import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { sendResponse } from '../utils/response';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode, message, details } = extractErrorInfo(error);

  // Log error for debugging
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      message: error.message,
      stack: error.stack,
      statusCode
    }
  });

  // Don't expose error details in production unless it's an operational error
  if (process.env.NODE_ENV === 'production' && !(error instanceof ApiError)) {
    message = 'Internal server error';
    details = undefined;
  }

  sendResponse(res, {
    statusCode,
    success: false,
    message,
    errors: details ? [details] : undefined
  });
};

function extractErrorInfo(error: Error): { statusCode: number; message: string; details?: any } {
  // Handle custom API errors
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      details: error.details
    };
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        return {
          statusCode: 409,
          message: 'A record with this information already exists',
          details: `Unique constraint violation: ${prismaError.meta?.target?.join(', ') || 'unknown field'}`
        };
      case 'P2003':
        return {
          statusCode: 400,
          message: 'Referenced record does not exist',
          details: `Foreign key constraint violation: ${prismaError.meta?.field_name || 'unknown field'}`
        };
      case 'P2025':
        return {
          statusCode: 404,
          message: 'Record not found',
          details: 'The requested record does not exist'
        };
      case 'P2014':
        return {
          statusCode: 400,
          message: 'Invalid relationship data',
          details: 'The change would violate a required relation'
        };
      default:
        return {
          statusCode: 500,
          message: 'Database operation failed',
          details: process.env.NODE_ENV === 'development' ? prismaError.message : undefined
        };
    }
  }

  // Handle Prisma validation errors
  if (error.name === 'PrismaClientValidationError') {
    return {
      statusCode: 400,
      message: 'Invalid data provided',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please check your input data'
    };
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    const zodError = error as any;
    return {
      statusCode: 400,
      message: 'Validation failed',
      details: zodError.errors
    };
  }

  // Handle file system errors
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return {
      statusCode: 500,
      message: 'File operation failed',
      details: 'Required file or directory not found'
    };
  }

  if ((error as NodeJS.ErrnoException).code === 'EACCES') {
    return {
      statusCode: 500,
      message: 'File operation failed',
      details: 'Permission denied'
    };
  }

  // Handle JSON parse errors
  if (error instanceof SyntaxError && 'body' in error) {
    return {
      statusCode: 400,
      message: 'Invalid JSON format',
      details: 'Request body contains invalid JSON'
    };
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          statusCode: 413,
          message: 'File too large',
          details: 'The uploaded file exceeds the size limit'
        };
      case 'LIMIT_FILE_COUNT':
        return {
          statusCode: 400,
          message: 'Too many files',
          details: 'The number of files exceeds the limit'
        };
      default:
        return {
          statusCode: 400,
          message: 'File upload error',
          details: multerError.message
        };
    }
  }

  // Handle CORS errors
  if (error.message.includes('CORS')) {
    return {
      statusCode: 403,
      message: 'CORS policy violation',
      details: 'Cross-origin request not allowed'
    };
  }

  // Handle rate limiting errors
  if (error.message.includes('rate limit')) {
    return {
      statusCode: 429,
      message: 'Too many requests',
      details: 'Rate limit exceeded. Please try again later'
    };
  }

  // Default error
  return {
    statusCode: 500,
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  };
}

export const notFoundHandler = (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: 404,
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};