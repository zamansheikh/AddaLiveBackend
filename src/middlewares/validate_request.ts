import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { error } from 'console';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (DTOClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(DTOClass, req.body);
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
        next(errors)
    }

    req.body = dtoInstance;
    next();
  };
};
