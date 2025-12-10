import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import AppError from "../errors/app_errors";
import BlockedEmailModel from "../../models/security/blocked_emails";
import { BlockedEmailRepository } from "../../repository/security/blockedEmailRepository";
import { blockedEmailRepositoryObject } from "../Utils/constant_repositories";

// Define the shape of the JWT payload
interface JwtPayload {
  id: string;
  role: string;
  permissions: string[];
  // Add more fields if needed
}

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const secret = process.env.JWT_SECRET || "jwt_secret";

// Higher-order middleware to accept roles
export const authenticate =
  (allowedRoles: string[] = []) =>
  async (req: Request, res: Response, next: NextFunction) => {
    // repository to check blocked emails
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(
        new AppError(
          StatusCodes.UNAUTHORIZED,
          "Authorization header missing or malformed"
        )
      );
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      req.user = decoded;

      // check if the token is banned
      const isBlocekd = await blockedEmailRepositoryObject.checkBlockedEmail(
        decoded.id
      );
      if (isBlocekd) {
        return next(
            new AppError(
              StatusCodes.FORBIDDEN,
              "Access denied: You are banned"
            )
          );
      }
      if (allowedRoles.length > 0) {
        // If specific roles are required, check them
        if (!decoded.role || !allowedRoles.includes(decoded.role)) {
          return next(
            new AppError(
              StatusCodes.FORBIDDEN,
              "Access denied: insufficient role"
            )
          );
        }
      }

      next();
    } catch (err) {
      next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired token"));
    }
  };
