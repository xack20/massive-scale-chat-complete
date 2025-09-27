import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Determine status code
  const rawStatus = (err.status ?? err.statusCode);
  const statusCode = typeof rawStatus === 'number' ? rawStatus : 500;

  // Prepare error response
  const response: any = {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add request ID if available
  const requestId = req.headers['x-request-id'];
  if (requestId) {
    response.requestId = requestId;
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle specific error types
  if (err.code === 'ECONNREFUSED') {
    response.message = 'Service temporarily unavailable';
    return res.status(503).json(response);
  }

  if (err.name === 'ValidationError') {
    response.error = 'Validation Error';
    return res.status(400).json(response);
  }

  if (err.name === 'CastError') {
    response.error = 'Invalid ID';
    response.message = 'The provided ID is invalid';
    return res.status(400).json(response);
  }

  if (err.name === 'MongoError' && String(err.code) === '11000') {
    response.error = 'Duplicate Entry';
    response.message = 'A record with this value already exists';
    return res.status(409).json(response);
  }

  // Send error response
  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};