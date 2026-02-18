import { NextFunction, Request, Response } from 'express';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({ message: 'Route not found' });
};

export const errorHandler = (err: Error & { statusCode?: number }, req: Request, res: Response, next: NextFunction): void => {
  console.error(err);
  const status = err.statusCode || 500;
  const response: Record<string, unknown> = {
    message: err.message || 'Internal server error'
  };
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }
  res.status(status).json(response);
};