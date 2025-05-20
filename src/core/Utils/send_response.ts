import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { token } from 'morgan';

type IData<T> = {
  success: boolean;
  statusCode: number;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
  };
  result?: T;
  access_token?: string;
};

export const sendResponseEnhanced = (res: Response, result?: any) => {
  const hasResult = result != null;
  let isResultTypeString;
  if (hasResult) {
    isResultTypeString = typeof result == "string";
  }

  sendResponse(res, {
    success: hasResult && !isResultTypeString,
    statusCode: hasResult && !isResultTypeString ? StatusCodes.ACCEPTED : StatusCodes.BAD_REQUEST,
    result: isResultTypeString ? null : result,
    ...(isResultTypeString ? { message: result } : {})
  });
}

const sendResponse = <T>(res: Response, data: IData<T>) => {
  const resData = {
    success: data.success,
    message: data.message,
    meta: data.meta,
    result: data.result,
    access_token: data.access_token
  };
  res.status(data.statusCode).json(resData);
};

export default sendResponse;