import mongoose from "mongoose";

export type TErrorSources = {
    path: string | number;
    message: string;
}[];

export type TGenericErrorResponse = {
    statusCode: number;
    message: string;
    errorSources: TErrorSources;
};

const handleCastError = (
    err: mongoose.Error.CastError,
): TGenericErrorResponse => {
    const errorSources: TErrorSources = [
        {
            path: err.path,
            message: err.message,
        },
    ];

    const statusCode = 400;

    return {
        statusCode,
        message: "Invalid ID",
        errorSources,
    };
};

export default handleCastError;