import fs from 'fs-extra';
import path from 'path';

export async function generateUtils(baseDir: string): Promise<void> {
  const utilsDir = path.join(baseDir, 'src/utils');
  await fs.ensureDir(utilsDir);

  // Generate ApiError class
  await generateApiError(utilsDir);
  
  // Generate catchAsync utility
  await generateCatchAsync(utilsDir);
  
  // Generate response utility
  await generateResponse(utilsDir);
  
  // Generate helpers utility
  await generateHelpers(utilsDir);
  
  // Generate middleware
  await generateMiddleware(baseDir);
}

async function generateApiError(utilsDir: string): Promise<void> {
  const content = `export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(statusCode: number, message: string, details?: any, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
`;

  await fs.writeFile(path.join(utilsDir, 'ApiError.ts'), content);
}

async function generateCatchAsync(utilsDir: string): Promise<void> {
  const content = `import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchAsync = (fn: AsyncFunction) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
`;

  await fs.writeFile(path.join(utilsDir, 'catchAsync.ts'), content);
}

async function generateResponse(utilsDir: string): Promise<void> {
  const content = `import { Response } from 'express';

interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  errors?: any;
}

export const sendResponse = <T>(res: Response, responseData: ApiResponse<T>): void => {
  const response: ApiResponse<T> = {
    statusCode: responseData.statusCode,
    success: responseData.success,
    message: responseData.message,
  };

  if (responseData.data !== undefined) {
    response.data = responseData.data;
  }

  if (responseData.meta) {
    response.meta = responseData.meta;
  }

  if (responseData.errors) {
    response.errors = responseData.errors;
  }

  res.status(responseData.statusCode).json(response);
};
`;

  await fs.writeFile(path.join(utilsDir, 'response.ts'), content);
}

async function generateHelpers(utilsDir: string): Promise<void> {
  const content = `export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toCamelCase = (str: string): string => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export const toKebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
};

export const toSnakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
};

export const validateEntityName = (name: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if name is empty
  if (!name || name.trim().length === 0) {
    errors.push('Entity name cannot be empty');
  }
  
  // Check for valid JavaScript identifier
  const jsIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  if (!jsIdentifierRegex.test(name)) {
    errors.push('Entity name must be a valid JavaScript identifier');
  }
  
  // Check for reserved JavaScript keywords
  const reservedKeywords = [
    'abstract', 'arguments', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else',
    'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for',
    'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface',
    'let', 'long', 'native', 'new', 'null', 'package', 'private', 'protected', 'public',
    'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw',
    'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while',
    'with', 'yield'
  ];
  
  if (reservedKeywords.includes(name.toLowerCase())) {
    errors.push(\`"\${name}" is a reserved JavaScript keyword\`);
  }
  
  // Check for common problematic names
  const problematicNames = ['constructor', 'prototype', 'toString', 'valueOf'];
  if (problematicNames.includes(name.toLowerCase())) {
    errors.push(\`"\${name}" conflicts with JavaScript built-in properties\`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePropertyName = (name: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Reuse entity name validation
  const entityValidation = validateEntityName(name);
  errors.push(...entityValidation.errors);
  
  // Additional property-specific validations
  const sqlReservedWords = [
    'select', 'from', 'where', 'insert', 'update', 'delete', 'create', 'drop', 'alter',
    'table', 'database', 'index', 'view', 'trigger', 'procedure', 'function', 'user',
    'group', 'order', 'by', 'having', 'group', 'union', 'join', 'inner', 'outer', 'left',
    'right', 'full', 'cross', 'on', 'as', 'and', 'or', 'not', 'null', 'is', 'like',
    'between', 'in', 'exists', 'any', 'all', 'some', 'case', 'when', 'then', 'else',
    'end', 'cast', 'convert', 'count', 'sum', 'avg', 'min', 'max', 'distinct'
  ];
  
  if (sqlReservedWords.includes(name.toLowerCase())) {
    errors.push(\`"\${name}" is a SQL reserved word and may cause issues\`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous characters
    .replace(/\\s+/g, ' '); // Normalize whitespace
};

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const mapFieldType = (type: string): string => {
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
    case 'undefined':
    case 'null':
    case 'any':
    case 'unknown':
    case 'void':
    case 'never':
      return type;
    case 'object':
      return 'Record<string, any>';
    case 'array':
      return 'any[]';
    case 'function':
      return '(...args: any[]) => any';
    case 'date':
      return 'Date';
    case 'json':
      return 'Record<string, any>';
    default:
      return type; // custom string type like 'uuid', 'slug', etc.
  }
};
`;

  await fs.writeFile(path.join(utilsDir, 'helpers.ts'), content);
}

async function generateMiddleware(baseDir: string): Promise<void> {
  const middlewareDir = path.join(baseDir, 'src/middleware');
  await fs.ensureDir(middlewareDir);

  // Generate error handler middleware
  const errorHandlerContent = `import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { sendResponse } from '../utils/response';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode, message } = err;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  const response: any = {
    statusCode,
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (err.details) {
    response.errors = err.details;
  }

  sendResponse(res, response);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const err = new ApiError(404, \`Route \${req.originalUrl} not found\`);
  next(err);
};
`;

  await fs.writeFile(path.join(middlewareDir, 'errorHandler.ts'), errorHandlerContent);
}