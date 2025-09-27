import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

const isPrismaKnownRequestError = (
  error: unknown
): error is ErrorWithStatus & { code: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
};

const isPrismaValidationError = (
  error: unknown
): error is ErrorWithStatus & { name: 'PrismaClientValidationError' } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'PrismaClientValidationError'
  );
};

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip
  });

  // Handle Prisma errors
  if (isPrismaKnownRequestError(err)) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A record with this value already exists'
      });
    }

    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Record not found'
      });
    }
  }

  if (isPrismaValidationError(err)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided'
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};
