import express, { RequestHandler, Request, Response, NextFunction } from "express";
import * as util from "./modules/util";
import * as errorUtil from "./modules/errorUtil";
import * as authUtil from "./modules/authUtil";

// ルーティングする
const router = express.Router();

// 非同期メソッドをラップする関数
interface PromiseRequestHandler {
  (req: Request, res: Response, next: NextFunction): Promise<unknown>;
}
export const wrapAsyncMiddleware = (
  fn: PromiseRequestHandler
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
};

// ルーティング
router.get('/libraries/fetch', wrapAsyncMiddleware(async (req, res) => {
  const isAuth = authUtil.isAuth(req.query.accessToken?.toString())

  //ログイン済みでなければログインエラー
  if(!isAuth) errorUtil.throwError(res, "ログインをしてください", util.STATUS_CODES.UNAUTHORIZED)

  res.status(util.STATUS_CODES.OK)
  util.sendJson(res, 'OK', {libraries: []});
}));

//routerをモジュールとして扱う準備
module.exports = router;