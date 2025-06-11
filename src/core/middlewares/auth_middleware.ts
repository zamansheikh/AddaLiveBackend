import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

// Extend the Request interface to include the 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
import jwt from 'jsonwebtoken';
import AppError from '../errors/app_errors';

interface JwtPayload {
  id: string;
  // add more fields as needed
}

const secret = process.env.JWT_SECRET || 'your-default-secret'; // ensure you load from .env

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authorization header missing or malformed");
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded; // Extend Request type to fix TS error
    // console.log(req.user);
    next();
  } catch (err) {
    next(err);
  }
};
