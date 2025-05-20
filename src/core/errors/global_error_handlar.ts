import { ErrorRequestHandler } from "express";
import handleCastError, { TErrorSources } from "./cast_error";
import handleValidationError from "./validation_error";
import handleDuplicateError from "./duplicate_error";
import AppError from "./app_errors";



// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalErrorHandler: ErrorRequestHandler = (err, req, res, next): any => {
    let statusCode = 500;
    let message = "Something went wrong!";
    let errorSources: TErrorSources = [
        {
            path: "",
            message: "Something went wrong",
        },
    ];
    if (err?.name === "ValidationError") {
        console.log(err);
        const simplifiedError = handleValidationError(err);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorSources = simplifiedError?.errorSources;
    } else if (err?.name === "CastError") {
        const simplifiedError = handleCastError(err);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorSources = simplifiedError?.errorSources;
    } else if (err?.code === 11000) {
        const simplifiedError = handleDuplicateError(err);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorSources = simplifiedError?.errorSources;
    } else if (err instanceof AppError) {
        statusCode = err?.statusCode;
        message = err.message;
        errorSources = [
            {
                path: "",
                message: err?.message,
            },
        ];
    } else if (err instanceof Error) {
        message = err.message;
        errorSources = [
            {
                path: "",
                message: err?.message,
            },
        ];
    }


    

    //ultimate return
    return res.status(statusCode).json({
        success: false,
        message,
        errorSources,
        err,
        stack: process.env.NODE_ENV === "development" ? err?.stack : null,
    });
};

export default globalErrorHandler;