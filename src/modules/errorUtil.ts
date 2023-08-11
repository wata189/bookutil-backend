import {Request, Response, NextFunction} from 'express';
import {STATUS_CODES, sendJson} from './util';

// error投げる処理
export const throwError = (res: Response, msg?: string, statusCode?: number): void => {
  // 引数なかった場合の処理
  if (!msg) msg = '不明なサーバーエラー';
  if (!statusCode) statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR;

  res.status(statusCode);
  throw new Error(msg);
};

// NOT FOUNDエラーの処理
export const catchNotFound = (req: Request, res: Response): void => {
  throwError(res, 'NOT FOUND', STATUS_CODES.NOT_FOUND);
};
// app.jsの最後に設定してすべてのエラーをキャッチする
export const catchError = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // TODO:ロガー systemLogger.error(err);
  if (!res.statusCode) res.status(STATUS_CODES.INTERNAL_SERVER_ERROR);

  sendJson(res, err.message, {err});
};
