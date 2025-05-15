import {Response,  NextFunction, Request } from "express";


export const customValidateFileResponse = ({isvideo}:{isvideo: boolean}) => {
    return async(req: Request, res: Response, next: NextFunction) => {
        if (!req.file) {
            return next(new Error("File is missing in the request."));
        }

        if (isvideo && req.file.mimetype !== 'video/mp4') {
            return next(new Error("File must be a video."));
        }

        next();
    };
}