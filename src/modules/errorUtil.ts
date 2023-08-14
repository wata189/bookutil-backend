import {Request, Response, NextFunction} from 'express';
import * as util from './util';
import { systemLogger } from './logUtil';

// error投げる処理
export const throwError = (res: Response, msg?: string, statusCode?: number): void => {
  // 引数なかった場合の処理
  if (!msg) msg = '不明なサーバーエラー';
  if (!statusCode) statusCode = util.STATUS_CODES.INTERNAL_SERVER_ERROR;

  res.status(statusCode);
  throw new Error(msg);
};

// NOT FOUNDエラーの処理
export const catchNotFound = (req: Request, res: Response): void => {
  throwError(res, '指定したページは存在しません', util.STATUS_CODES.NOT_FOUND);
};
// app.jsの最後に設定してすべてのエラーをキャッチする
export const catchError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  systemLogger.error(err);
  if (!res.statusCode) res.status(util.STATUS_CODES.INTERNAL_SERVER_ERROR);

  util.sendJson(res, err.message, {err});
};
