import { NextFunction, Request, Response } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[MESSAGE SERVICE AUTH] Headers: ${JSON.stringify(req.headers)}`);
  const userId = req.headers['x-user-id'];
  console.log(`[MESSAGE SERVICE AUTH] x-user-id: ${userId}`);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No valid authentication token provided' });
  }
  next();
};
