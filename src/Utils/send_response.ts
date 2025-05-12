import { Response } from 'express';
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