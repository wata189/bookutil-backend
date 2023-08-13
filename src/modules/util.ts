import {Response} from 'express';
import { systemLogger } from './logUtil';

//ステータスコード定数
export const STATUS_CODES = {
  CONTINUE: 100,
  SWITCHING_PROTOCOL: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,

  MULTIPLE_CHOICE: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,

  INTERNAL_SERVER_ERROR: 500,
};

export const isEnv = ():boolean => {
  return process.env.ENV === "dev";
};

export const sendJson = (res: Response, msg?: string, data?: Object): void => {
  // 引数なかった場合の処理
  if (!res.statusCode) res.status(STATUS_CODES.OK);
  if (!msg) msg = '';
  if (!data) data = {};

  const result = {...data, status: res.statusCode, msg};
  res.json(result);

  systemLogger.info(`${res.statusCode} ${msg}`);
};
